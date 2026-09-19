"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeEngineering, CALC_ENGINE_VERSION, type CalcSettings } from "@/lib/calc-engine";
import type { BomTemplateLine, ServiceType, SystemType, VatTreatment } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createQuotation(formData: FormData) {
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("create_quotation", {
    p_customer_id: String(formData.get("customer_id")),
    p_site_id: String(formData.get("site_id") ?? "") || null,
    p_project_name: String(formData.get("project_name") ?? "").trim(),
    p_service_type: String(formData.get("service_type")) as ServiceType,
    p_system_type: String(formData.get("system_type")) as SystemType,
    p_assigned_sales_id: String(formData.get("assigned_sales_id") ?? "") || null,
    p_assigned_engineer_id: String(formData.get("assigned_engineer_id") ?? "") || null,
  });

  if (error) throw new Error(`Could not create quotation: ${error.message}`);

  revalidatePath("/quotations");
  redirect(`/quotations/${(data as { quotation_id: string }).quotation_id}`);
}

export async function createRevision(quotationId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const reason = String(formData.get("reason") ?? "").trim();
  const reprice = formData.get("reprice") === "on";

  const { error } = await supabase.rpc("create_revision", {
    p_quotation_id: quotationId,
    p_reason: reason,
    p_reprice: reprice,
  });

  if (error) throw new Error(`Could not create revision: ${error.message}`);

  revalidatePath(`/quotations/${quotationId}`);
}

export async function changeStatus(
  quotationId: string,
  revisionId: string,
  toStatus: string,
  formData: FormData
) {
  const { supabase } = await requireUser();

  const note = String(formData.get("note") ?? "").trim() || null;

  const { error } = await supabase.rpc("change_revision_status", {
    p_revision_id: revisionId,
    p_to_status: toStatus,
    p_note: note,
  });

  if (error) throw new Error(`Could not change status: ${error.message}`);

  revalidatePath(`/quotations/${quotationId}`);
}

export async function overrideMargin(
  quotationId: string,
  revisionId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();
  const reason = String(formData.get("reason") ?? "").trim();

  const { error } = await supabase.rpc("override_margin", {
    p_revision_id: revisionId,
    p_reason: reason,
  });

  if (error) throw new Error(`Could not override margin: ${error.message}`);

  revalidatePath(`/quotations/${quotationId}`);
}

export async function updateRevisionHeader(
  quotationId: string,
  revisionId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();

  const payload = {
    payment_terms: String(formData.get("payment_terms") ?? "").trim() || null,
    delivery_timeline: String(formData.get("delivery_timeline") ?? "").trim() || null,
    warranty_terms: String(formData.get("warranty_terms") ?? "").trim() || null,
    scope_of_work: String(formData.get("scope_of_work") ?? "").trim() || null,
    inclusions: String(formData.get("inclusions") ?? "").trim() || null,
    exclusions: String(formData.get("exclusions") ?? "").trim() || null,
    terms_conditions: String(formData.get("terms_conditions") ?? "").trim() || null,
    net_metering_note: String(formData.get("net_metering_note") ?? "").trim() || null,
    validity_days: Number(formData.get("validity_days") ?? 30),
  };

  const { error } = await supabase
    .from("quotation_revisions")
    .update(payload)
    .eq("id", revisionId);

  if (error) throw new Error(`Could not save quotation details: ${error.message}`);

  revalidatePath(`/quotations/${quotationId}`);
}

// Fields updateConfiguration knows how to save. The form on each tab only
// submits a subset of these (e.g. Load & Sizing submits just critical_load_kw
// and required_backup_hours) — only keys actually present in the FormData
// are written, so saving one tab's form never nulls out another tab's fields.
const CONFIGURATION_NUMBER_FIELDS = [
  "module_quantity",
  "dc_capacity_kwp",
  "inverter_quantity",
  "inverter_ac_kw_total",
  "dc_ac_ratio",
  "battery_quantity",
  "battery_nameplate_kwh_total",
  "battery_usable_kwh_total",
  "critical_load_kw",
  "required_backup_hours",
  "peak_sun_hours_used",
  "performance_ratio_used",
  "analysis_years",
] as const;

const CONFIGURATION_TEXT_FIELDS = [
  // module_name/inverter_name/battery_name are free-typed (2026-09-19 —
  // System Design no longer offers a catalog dropdown for these). The
  // *_equipment_id fields are kept in this list only so an older
  // integration or a future picker could still set them; the current form
  // never submits them, so they stay null on new revisions.
  "module_equipment_id",
  "module_name",
  "inverter_equipment_id",
  "inverter_name",
  "battery_equipment_id",
  "battery_name",
  "mounting_type_id",
  "mounting_type",
  "mounting_notes",
  // monitoring_system/protection_notes/bos_notes are no longer on the
  // System Design form (2026-09-19) — Joel wants Protection/BOS to live on
  // the BOQ tab instead, as priced line items. Kept here/in the DB for any
  // older revision still carrying a value, and in case a BOQ-side feature
  // wants to write them later.
  "monitoring_system",
  "protection_notes",
  "bos_notes",
  "accessories_notes",
] as const;

export async function updateConfiguration(
  quotationId: string,
  revisionId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();

  const payload: Record<string, number | string | null> = {};

  for (const key of CONFIGURATION_NUMBER_FIELDS) {
    if (!formData.has(key)) continue;
    const v = formData.get(key);
    payload[key] = v === null || v === "" ? null : Number(v);
  }
  for (const key of CONFIGURATION_TEXT_FIELDS) {
    if (!formData.has(key)) continue;
    payload[key] = String(formData.get(key) ?? "").trim() || null;
  }

  // mounting_type stays a free-text column for backward compatibility
  // (historical revisions, the printed proposal, anything else still
  // reading it as text). When a mounting type is picked from the new
  // dropdown, mirror its name into that column so those readers keep
  // working without changes.
  if (formData.has("mounting_type_id")) {
    const mountingTypeId = payload.mounting_type_id as string | null;
    if (mountingTypeId) {
      const { data: mt } = await supabase
        .from("mounting_types")
        .select("name")
        .eq("id", mountingTypeId)
        .maybeSingle();
      payload.mounting_type = mt?.name ?? null;
    } else {
      payload.mounting_type = null;
    }
  }

  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase
    .from("revision_configurations")
    .update(payload)
    .eq("revision_id", revisionId);

  if (error) throw new Error(`Could not save configuration: ${error.message}`);

  revalidatePath(`/quotations/${quotationId}`);
}

export async function updateSiteSizing(
  quotationId: string,
  siteId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();

  const num = (key: string) => {
    const v = formData.get(key);
    return v === null || v === "" ? null : Number(v);
  };

  const payload = {
    blended_retail_rate_php_kwh: num("blended_retail_rate_php_kwh"),
    net_metering_eligible: formData.get("net_metering_eligible") === "on",
    net_metering_export_rate_php_kwh: num("net_metering_export_rate_php_kwh"),
    peak_sun_hours_per_day: num("peak_sun_hours_per_day"),
  };

  const { error } = await supabase.from("sites").update(payload).eq("id", siteId);
  if (error) throw new Error(`Could not save site sizing details: ${error.message}`);

  revalidatePath(`/quotations/${quotationId}`);
}

export async function addSiteConsumption(quotationId: string, siteId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const year = Number(formData.get("period_year"));
  const month = Number(formData.get("period_month"));
  const kwh = Number(formData.get("kwh"));
  if (!year || !month || !kwh) {
    throw new Error("Year, month, and kWh are required.");
  }

  const billRaw = formData.get("bill_amount_php");
  const peakRaw = formData.get("peak_demand_kw");

  const { error } = await supabase.from("site_consumption").upsert(
    {
      site_id: siteId,
      period_year: year,
      period_month: month,
      kwh,
      bill_amount_php: billRaw ? Number(billRaw) : null,
      peak_demand_kw: peakRaw ? Number(peakRaw) : null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
    { onConflict: "site_id,period_year,period_month" }
  );

  if (error) throw new Error(`Could not save consumption record: ${error.message}`);

  revalidatePath(`/quotations/${quotationId}`);
}

export async function deleteSiteConsumption(quotationId: string, consumptionId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("site_consumption").delete().eq("id", consumptionId);
  if (error) throw new Error(`Could not delete consumption record: ${error.message}`);
  revalidatePath(`/quotations/${quotationId}`);
}

export async function updateBomLineProposalGroup(
  quotationId: string,
  bomLineId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();
  const value = String(formData.get("proposal_group") ?? "").trim() || null;

  const { error } = await supabase
    .from("revision_bom_lines")
    .update({ proposal_group: value })
    .eq("id", bomLineId);

  if (error) throw new Error(`Could not update proposal grouping: ${error.message}`);

  revalidatePath(`/quotations/${quotationId}`);
}

export async function recalculateEngineering(quotationId: string, revisionId: string) {
  const { supabase } = await requireUser();

  const [{ data: cfg }, { data: costing }, { data: pricing }, { data: quotation }, { data: settingsRows }] =
    await Promise.all([
      supabase.from("revision_configurations").select("*").eq("revision_id", revisionId).single(),
      supabase.from("revision_costing").select("*").eq("revision_id", revisionId).single(),
      supabase.from("revision_pricing").select("*").eq("revision_id", revisionId).single(),
      supabase.from("quotations").select("site_id").eq("id", quotationId).single(),
      supabase.from("settings").select("key, value"),
    ]);

  if (!cfg || !costing || !pricing) {
    throw new Error("Configuration, costing, or pricing not found for this revision.");
  }

  const settingsMap = new Map<string, unknown>((settingsRows ?? []).map((r) => [r.key, r.value]));
  const getNum = (key: string, fallback: number) => {
    const v = settingsMap.get(key);
    return typeof v === "number" ? v : fallback;
  };

  const calcSettings: CalcSettings = {
    peakSunHoursDefault: getNum("energy.peak_sun_hours_default", 4.5),
    performanceRatioDefault: getNum("energy.performance_ratio_default", 0.78),
    annualDegradation: getNum("energy.annual_degradation", 0.005),
    firstYearLid: getNum("energy.first_year_lid", 0.02),
    monthlyDistribution: Array.isArray(settingsMap.get("energy.monthly_distribution"))
      ? (settingsMap.get("energy.monthly_distribution") as number[])
      : Array(12).fill(1 / 12),
    analysisYears: getNum("energy.analysis_years", 25),
    layoutFactor: getNum("engineering.layout_factor", 1.3),
    discountRate: getNum("finance.discount_rate", 0.08),
    gridEmissionFactorKgPerKwh: getNum("environment.grid_emission_factor_kg_per_kwh", 0.62),
    omCostPctOfCapex: getNum("finance.om_cost_pct_of_capex", 0.01),
    inverterReplacementYear: getNum("finance.inverter_replacement_year", 12),
    inverterReplacementCostPct: getNum("finance.inverter_replacement_cost_pct", 0.1),
    interannualCv: getNum("energy.interannual_cv_pct", 0.05),
  };

  // site + consumption context (best effort — falls back to defaults)
  const siteId = (quotation as { site_id: string | null } | null)?.site_id ?? null;
  let blendedRate = 12; // conservative PHP/kWh fallback
  let netMeteringEligible = false;
  let netMeteringRate: number | null = null;
  let annualConsumption: number | null = null;
  let moduleAreaSqm: number | null = null;

  if (siteId) {
    const { data: site } = await supabase.from("sites").select("*").eq("id", siteId).maybeSingle();
    if (site) {
      if (site.blended_retail_rate_php_kwh) blendedRate = site.blended_retail_rate_php_kwh;
      netMeteringEligible = !!site.net_metering_eligible;
      netMeteringRate = site.net_metering_export_rate_php_kwh ?? null;
      if (!cfg.peak_sun_hours_used && site.peak_sun_hours_per_day) {
        calcSettings.peakSunHoursDefault = site.peak_sun_hours_per_day;
      }
    }
    const { data: consumptionSummary } = await supabase
      .from("v_site_consumption_summary")
      .select("annualised_kwh")
      .eq("site_id", siteId)
      .maybeSingle();
    annualConsumption = consumptionSummary?.annualised_kwh ?? null;
  }

  // Required-roof-area is only computable when the module is linked to a
  // catalog item with a known per-panel area (module_area_sqm). Since the
  // System Design tab no longer offers a catalog dropdown for Module
  // (2026-09-19 — free text instead, per Joel's request), cfg.module_equipment_id
  // is null on every revision created going forward, so this simply stays
  // skipped and "Required roof area" reads "—" for those revisions — same
  // as it already did whenever the dropdown was left blank. Older revisions
  // that still carry a module_equipment_id from before this change keep
  // computing it as before.
  if (cfg.module_equipment_id) {
    const { data: moduleEq } = await supabase
      .from("equipment")
      .select("module_area_sqm")
      .eq("id", cfg.module_equipment_id)
      .maybeSingle();
    moduleAreaSqm = moduleEq?.module_area_sqm ?? null;
  }

  const dcCapacityKwp = cfg.dc_capacity_kwp ?? 0;
  const peakSunHours = cfg.peak_sun_hours_used ?? calcSettings.peakSunHoursDefault;
  const performanceRatio = cfg.performance_ratio_used ?? calcSettings.performanceRatioDefault;

  const outputs = computeEngineering(
    {
      dcCapacityKwp,
      moduleAreaSqm,
      moduleQuantity: cfg.module_quantity ?? 0,
      peakSunHours,
      performanceRatio,
      blendedRateePhpPerKwh: blendedRate,
      netMeteringEligible,
      netMeteringExportRatePhpPerKwh: netMeteringRate,
      annualConsumptionKwh: annualConsumption,
      totalProjectCostPhp: costing.total_project_cost_php ?? 0,
      totalContractPricePhp: pricing.total_contract_price_php ?? 0,
    },
    calcSettings
  );

  const { error } = await supabase
    .from("revision_configurations")
    .update({
      peak_sun_hours_used: peakSunHours,
      performance_ratio_used: performanceRatio,
      annual_degradation_used: calcSettings.annualDegradation,
      monthly_distribution: calcSettings.monthlyDistribution,
      analysis_years: calcSettings.analysisYears,
      annual_kwh_year1: outputs.annualKwhYear1,
      monthly_kwh: outputs.monthlyKwh,
      lifetime_kwh: outputs.lifetimeKwh,
      self_consumed_kwh_year1: outputs.selfConsumedKwhYear1,
      exported_kwh_year1: outputs.exportedKwhYear1,
      annual_savings_year1_php: outputs.annualSavingsYear1Php,
      co2_avoided_kg_year1: outputs.co2AvoidedKgYear1,
      simple_payback_years: outputs.simplePaybackYears,
      roi_pct: outputs.roiPct,
      npv_php: outputs.npvPhp,
      irr_pct: outputs.irrPct,
      lcoe_php_per_kwh: outputs.lcoePhpPerKwh,
      required_area_sqm: outputs.requiredAreaSqm,
      calc_engine_version: CALC_ENGINE_VERSION,
      calc_inputs: {
        dcCapacityKwp,
        peakSunHours,
        performanceRatio,
        blendedRate,
        netMeteringEligible,
        netMeteringRate,
        annualConsumption,
      },
      calc_outputs: outputs,
      validation_passed: true,
      validation_results: { engine: CALC_ENGINE_VERSION, ranAt: new Date().toISOString() },
    })
    .eq("revision_id", revisionId);

  if (error) throw new Error(`Could not save engineering results: ${error.message}`);

  revalidatePath(`/quotations/${quotationId}`);
}

export async function updateCosting(quotationId: string, revisionId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const pricingMode = String(formData.get("pricing_mode"));
  const payload = {
    pricing_mode: pricingMode,
    markup_rate: pricingMode === "markup_on_cost" ? Number(formData.get("markup_rate")) / 100 : null,
    target_gross_margin:
      pricingMode === "target_margin" ? Number(formData.get("target_gross_margin")) / 100 : null,
    contingency_rate: Number(formData.get("contingency_rate")) / 100,
    min_margin_required: Number(formData.get("min_margin_required")) / 100,
  };

  const { error } = await supabase.from("revision_costing").update(payload).eq("revision_id", revisionId);
  if (error) throw new Error(`Could not save pricing settings: ${error.message}`);

  await supabase.rpc("recalculate_revision_financials", { p_revision_id: revisionId });

  revalidatePath(`/quotations/${quotationId}`);
}

export async function updatePricing(quotationId: string, revisionId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const payload = {
    vat_treatment: String(formData.get("vat_treatment")) as VatTreatment,
    discount_php: Number(formData.get("discount_php") ?? 0),
  };

  const { error } = await supabase.from("revision_pricing").update(payload).eq("revision_id", revisionId);
  if (error) throw new Error(`Could not save VAT/discount: ${error.message}`);

  await supabase.rpc("recalculate_revision_financials", { p_revision_id: revisionId });

  revalidatePath(`/quotations/${quotationId}`);
}

export async function addBomLine(quotationId: string, revisionId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const quantity = Number(formData.get("quantity"));
  const sellingUnitPrice = Number(formData.get("selling_unit_price_php"));
  const unitCost = Number(formData.get("unit_cost_php") ?? 0);
  const markupRate = Number(formData.get("markup_rate") ?? 0) / 100;

  const { count } = await supabase
    .from("revision_bom_lines")
    .select("id", { count: "exact", head: true })
    .eq("revision_id", revisionId);

  const { data: line, error } = await supabase
    .from("revision_bom_lines")
    .insert({
      revision_id: revisionId,
      line_no: (count ?? 0) + 1,
      category_id: String(formData.get("category_id")),
      equipment_id: String(formData.get("equipment_id") ?? "") || null,
      description: String(formData.get("description") ?? "").trim(),
      manufacturer: String(formData.get("manufacturer") ?? "").trim() || null,
      model: String(formData.get("model") ?? "").trim() || null,
      quantity,
      unit: String(formData.get("unit") ?? "pc").trim(),
      selling_unit_price_php: sellingUnitPrice,
      selling_line_total_php: Math.round(quantity * sellingUnitPrice * 100) / 100,
      show_on_document: formData.get("show_on_document") !== "off",
      notes: String(formData.get("notes") ?? "").trim() || null,
      proposal_group: String(formData.get("proposal_group") ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Could not add BOM line: ${error.message}`);

  const { error: costError } = await supabase.from("revision_bom_line_costs").insert({
    bom_line_id: line.id,
    revision_id: revisionId,
    unit_cost_php: unitCost,
    line_cost_php: Math.round(unitCost * quantity * 100) / 100,
    markup_rate: markupRate,
    supplier_id: String(formData.get("supplier_id") ?? "") || null,
    price_record_id: String(formData.get("price_record_id") ?? "") || null,
    price_is_estimate: formData.get("price_is_estimate") === "on",
  });

  if (costError) throw new Error(`Could not save BOM line cost: ${costError.message}`);

  revalidatePath(`/quotations/${quotationId}`);
}

// Adds a line to the BOQ from the Ancillary Services catalog (Mobilization/
// Demobilization, trenching, canopy fabrication, roof painting, service
// entrance remodeling, etc. — managed under Ancillary Services). Mirrors
// addBomLine's insert-then-cost-row shape. Cost is set equal to the
// selling rate (zero-margin pass-through) since these services carry a
// single rate on file, not a separate cost/markup split — correct the
// rate under Ancillary Services, or delete and re-add the line.
export async function addAncillaryServiceLine(
  quotationId: string,
  revisionId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();

  const serviceId = String(formData.get("service_id") ?? "").trim();
  if (!serviceId) throw new Error("Choose an ancillary service first.");

  const { data: service, error: serviceError } = await supabase
    .from("ancillary_services")
    .select("*")
    .eq("id", serviceId)
    .single();
  if (serviceError || !service) throw new Error("Could not load that ancillary service.");
  if (!service.default_category_id) {
    throw new Error(
      `"${service.name}" has no equipment category set — set one under Ancillary Services first.`
    );
  }

  const quantity = service.pricing_method === "flat" ? 1 : Number(formData.get("quantity") ?? 0);
  if (!quantity || quantity <= 0) {
    throw new Error(`Enter a quantity (${service.unit_label ?? "unit"}) greater than zero.`);
  }

  const rate = service.rate_php ?? 0;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { count } = await supabase
    .from("revision_bom_lines")
    .select("id", { count: "exact", head: true })
    .eq("revision_id", revisionId);

  const { data: line, error } = await supabase
    .from("revision_bom_lines")
    .insert({
      revision_id: revisionId,
      line_no: (count ?? 0) + 1,
      category_id: service.default_category_id,
      description: service.name,
      quantity,
      unit: service.unit_label ?? "lot",
      selling_unit_price_php: rate,
      selling_line_total_php: Math.round(quantity * rate * 100) / 100,
      show_on_document: true,
      notes,
      proposal_group: service.default_proposal_group,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Could not add "${service.name}": ${error.message}`);

  const { error: costError } = await supabase.from("revision_bom_line_costs").insert({
    bom_line_id: line.id,
    revision_id: revisionId,
    unit_cost_php: rate,
    line_cost_php: Math.round(rate * quantity * 100) / 100,
    markup_rate: 0,
    price_is_estimate: true,
  });

  if (costError) {
    throw new Error(`Could not save cost for "${service.name}": ${costError.message}`);
  }

  revalidatePath(`/quotations/${quotationId}`);
}

// Applies a standard BOM template ("Package") to a revision: copies its
// lines onto revision_bom_lines at current catalog prices. Each template
// line flagged is_major (Solar Panel, Inverter, Battery, Mounting
// Structure) needs a specific catalog item chosen for this quotation —
// the form submits those as fields named major_<templateLineId>. Every
// other line is fixed and copies over as-is; if it has its own
// equipment_id it's priced from the catalog too, otherwise it lands at
// zero and can be corrected with "+ Add BOM line" like any manual line.
export async function applyBomTemplate(quotationId: string, revisionId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const templateId = String(formData.get("template_id") ?? "").trim();
  if (!templateId) throw new Error("Choose a template first.");

  const { data: lineRows, error: linesError } = await supabase
    .from("bom_template_lines")
    .select("*")
    .eq("template_id", templateId)
    .order("line_no");
  if (linesError) throw new Error(`Could not load the template: ${linesError.message}`);

  const templateLines = (lineRows ?? []) as BomTemplateLine[];
  if (templateLines.length === 0) {
    throw new Error("That template has no line items yet — add some under BOM Templates first.");
  }

  const resolvedEquipmentIds = new Map<string, string>();
  for (const line of templateLines) {
    if (line.is_major) {
      const chosen = String(formData.get(`major_${line.id}`) ?? "").trim();
      if (!chosen) {
        throw new Error(`Choose an item for "${line.description}" before applying the template.`);
      }
      resolvedEquipmentIds.set(line.id, chosen);
    } else if (line.equipment_id) {
      resolvedEquipmentIds.set(line.id, line.equipment_id);
    }
  }

  const catalogIds = Array.from(new Set(Array.from(resolvedEquipmentIds.values())));
  const { data: catalogRows, error: catalogError } =
    catalogIds.length > 0
      ? await supabase.from("v_equipment_current_price").select("*").in("id", catalogIds)
      : { data: [] as Record<string, unknown>[], error: null };
  if (catalogError) throw new Error(`Could not load catalog pricing: ${catalogError.message}`);
  const catalogMap = new Map((catalogRows ?? []).map((r) => [r.id as string, r]));

  const { count } = await supabase
    .from("revision_bom_lines")
    .select("id", { count: "exact", head: true })
    .eq("revision_id", revisionId);
  let nextLineNo = (count ?? 0) + 1;

  // Sequential on purpose (mirrors importCustomersCsv): a handful to a few
  // dozen lines per template, and each insert needs the previous line_no.
  for (const line of templateLines) {
    const equipmentId = resolvedEquipmentIds.get(line.id) ?? null;
    const catalog = equipmentId ? catalogMap.get(equipmentId) : undefined;

    const description = (catalog?.description as string) ?? line.description;
    const manufacturer = (catalog?.manufacturer as string | null) ?? line.manufacturer;
    const model = (catalog?.model as string | null) ?? line.model;
    const unit = (catalog?.unit as string) ?? line.unit;
    const quantity = line.quantity;
    // A line priced from the catalog (equipment_id resolved) always uses
    // the live current price, same as the manual Add-BOM-line form. A
    // freeform line with no catalog match has no live price to pull, so
    // it falls back to the reference unit_price_php entered on the
    // template itself, instead of landing on the BOM at ₱0.
    const unitCost = (catalog?.cost_price_php as number | null) ?? 0;
    const markupRate = (catalog?.default_markup_rate as number | null) ?? 0.2;
    const sellingUnitPrice = catalog
      ? Math.round(unitCost * (1 + markupRate) * 100) / 100
      : Math.round((line.unit_price_php ?? 0) * 100) / 100;
    const sellingLineTotal = Math.round(quantity * sellingUnitPrice * 100) / 100;

    const { data: inserted, error: insertError } = await supabase
      .from("revision_bom_lines")
      .insert({
        revision_id: revisionId,
        line_no: nextLineNo++,
        category_id: line.category_id,
        equipment_id: equipmentId,
        description,
        manufacturer,
        model,
        quantity,
        unit,
        selling_unit_price_php: sellingUnitPrice,
        selling_line_total_php: sellingLineTotal,
        show_on_document: true,
        notes: line.notes,
      })
      .select("id")
      .single();
    if (insertError) {
      throw new Error(`Could not add "${description}" from the template: ${insertError.message}`);
    }

    const { error: costError } = await supabase.from("revision_bom_line_costs").insert({
      bom_line_id: inserted.id,
      revision_id: revisionId,
      unit_cost_php: unitCost,
      line_cost_php: Math.round(unitCost * quantity * 100) / 100,
      markup_rate: markupRate,
      supplier_id: (catalog?.supplier_id as string | null) ?? null,
      price_record_id: (catalog?.price_record_id as string | null) ?? null,
      price_is_estimate: !catalog,
    });
    if (costError) {
      throw new Error(`Could not save cost for "${description}": ${costError.message}`);
    }
  }

  revalidatePath(`/quotations/${quotationId}`);
}

export async function deleteBomLine(quotationId: string, bomLineId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("revision_bom_lines").delete().eq("id", bomLineId);
  if (error) throw new Error(`Could not delete BOM line: ${error.message}`);
  revalidatePath(`/quotations/${quotationId}`);
}

export async function createProjectFromRevision(
  quotationId: string,
  revisionId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();

  const targetStart = String(formData.get("target_start_date") ?? "") || null;
  const targetCompletion = String(formData.get("target_completion_date") ?? "") || null;

  const { data, error } = await supabase.rpc("create_project_from_revision", {
    p_revision_id: revisionId,
    p_target_start: targetStart,
    p_target_completion: targetCompletion,
  });

  if (error) throw new Error(`Could not create project: ${error.message}`);

  revalidatePath(`/quotations/${quotationId}`);
  redirect(`/projects/${(data as { project_id: string }).project_id}`);
}
