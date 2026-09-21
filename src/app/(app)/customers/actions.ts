"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canWrite } from "@/lib/roles";
import { parseCsvToRecords } from "@/lib/csv";
import { parseCustomerRecord, type ParseIssue } from "@/lib/customer-import";
import type { CustomerType, LeadSource, ServiceEntrance } from "@/lib/types";

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: customerNo, error: numError } = await supabase.rpc("next_number", {
    p_code: "customer",
  });
  if (numError) {
    throw new Error(`Could not allocate a customer number: ${numError.message}`);
  }

  const payload = {
    customer_no: customerNo as string,
    customer_name: String(formData.get("customer_name") ?? "").trim(),
    company_name: String(formData.get("company_name") ?? "").trim() || null,
    customer_type: String(formData.get("customer_type")) as CustomerType,
    industry: String(formData.get("industry") ?? "").trim() || null,
    billing_address: String(formData.get("billing_address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    province: String(formData.get("province") ?? "").trim() || null,
    lead_source: String(formData.get("lead_source")) as LeadSource,
    lead_source_detail: String(formData.get("lead_source_detail") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user.id,
  };

  const { data: customer, error } = await supabase
    .from("customers")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not create customer: ${error.message}`);
  }

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canWrite(user.roles)) {
    throw new Error("Your role can't edit customers.");
  }

  const payload = {
    customer_name: String(formData.get("customer_name") ?? "").trim(),
    company_name: String(formData.get("company_name") ?? "").trim() || null,
    customer_type: String(formData.get("customer_type")) as CustomerType,
    industry: String(formData.get("industry") ?? "").trim() || null,
    billing_address: String(formData.get("billing_address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    province: String(formData.get("province") ?? "").trim() || null,
    lead_source: String(formData.get("lead_source")) as LeadSource,
    lead_source_detail: String(formData.get("lead_source_detail") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const { error } = await supabase.from("customers").update(payload).eq("id", customerId);
  if (error) {
    throw new Error(`Could not update customer: ${error.message}`);
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

// Soft delete: the row disappears from the customer list and can't be
// selected for new quotations, but stays on file (is_active=false) since
// past quotations, sites, and contacts still point at it and shouldn't
// lose their customer reference.
export async function deleteCustomer(customerId: string, _formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canWrite(user.roles)) {
    throw new Error("Your role can't delete customers.");
  }

  const { error } = await supabase
    .from("customers")
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq("id", customerId);
  if (error) {
    throw new Error(`Could not delete customer: ${error.message}`);
  }

  revalidatePath("/customers");
}

export async function createSite(customerId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: siteNo, error: numError } = await supabase.rpc("next_number", {
    p_code: "site",
  });
  if (numError) {
    throw new Error(`Could not allocate a site number: ${numError.message}`);
  }

  const payload = {
    site_no: siteNo as string,
    customer_id: customerId,
    site_name: String(formData.get("site_name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    province: String(formData.get("province") ?? "").trim() || null,
    service_entrance: (String(formData.get("service_entrance") ?? "") ||
      null) as ServiceEntrance | null,
    distribution_utility: String(formData.get("distribution_utility") ?? "").trim() || null,
    blended_retail_rate_php_kwh: formData.get("blended_retail_rate_php_kwh")
      ? Number(formData.get("blended_retail_rate_php_kwh"))
      : null,
    net_metering_eligible: formData.get("net_metering_eligible") === "on",
    peak_sun_hours_per_day: formData.get("peak_sun_hours_per_day")
      ? Number(formData.get("peak_sun_hours_per_day"))
      : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user.id,
  };

  const { error } = await supabase.from("sites").insert(payload);
  if (error) {
    throw new Error(`Could not create site: ${error.message}`);
  }

  revalidatePath(`/customers/${customerId}`);
}

export async function updateSite(siteId: string, customerId: string, formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canWrite(user.roles)) {
    throw new Error("Your role can't edit sites.");
  }

  const payload = {
    site_name: String(formData.get("site_name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    province: String(formData.get("province") ?? "").trim() || null,
    service_entrance: (String(formData.get("service_entrance") ?? "") ||
      null) as ServiceEntrance | null,
    distribution_utility: String(formData.get("distribution_utility") ?? "").trim() || null,
    blended_retail_rate_php_kwh: formData.get("blended_retail_rate_php_kwh")
      ? Number(formData.get("blended_retail_rate_php_kwh"))
      : null,
    net_metering_eligible: formData.get("net_metering_eligible") === "on",
    peak_sun_hours_per_day: formData.get("peak_sun_hours_per_day")
      ? Number(formData.get("peak_sun_hours_per_day"))
      : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const { error } = await supabase.from("sites").update(payload).eq("id", siteId);
  if (error) {
    throw new Error(`Could not update site: ${error.message}`);
  }

  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

// Soft delete: sites are referenced by quotations.site_id, projects.site_id,
// and site_consumption.site_id, so a hard DELETE would fail on (or silently
// orphan) any of those once a site has real history — same "never rewrite
// historical/locked data" pattern used for customers/equipment elsewhere in
// this app. `sites` only has `deleted_at` (no separate `is_active` column,
// unlike `customers`/`equipment`) — the site list and the `sites_read` RLS
// policy both already filter on `deleted_at is null`.
export async function deleteSite(siteId: string, customerId: string, _formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canWrite(user.roles)) {
    throw new Error("Your role can't delete sites.");
  }

  const { error } = await supabase
    .from("sites")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", siteId);
  if (error) {
    throw new Error(`Could not delete site: ${error.message}`);
  }

  revalidatePath(`/customers/${customerId}`);
}

// Bills are accepted as a photo or a scanned/exported PDF of the actual
// utility bill — kept in sync with the storage.buckets row's own
// file_size_limit/allowed_mime_types (migration
// site_bill_uploads_and_storage_bucket), so a rejected upload fails with a
// clear message here instead of an opaque Storage error.
const MAX_BILL_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_BILL_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

export async function uploadSiteBill(siteId: string, customerId: string, formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canWrite(user.roles)) {
    throw new Error("Your role can't upload bills.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a bill file first.");
  }
  if (file.size > MAX_BILL_SIZE_BYTES) {
    throw new Error("That file is larger than 15 MB — compress or split it before uploading.");
  }
  if (!ALLOWED_BILL_MIME_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, WEBP, HEIC, or PDF files are accepted for a bill upload.");
  }

  const periodYear = formData.get("period_year") ? Number(formData.get("period_year")) : null;
  const periodMonth = formData.get("period_month") ? Number(formData.get("period_month")) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // Prefix with the site id so every bill for a site sorts/lists together
  // in Storage, and a timestamp so two uploads with the same original
  // filename never collide.
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const storagePath = `${siteId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("site-bills")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    throw new Error(`Could not upload the bill file: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase.from("site_bill_uploads").insert({
    site_id: siteId,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    period_year: periodYear,
    period_month: periodMonth,
    notes,
    uploaded_by: user.id,
  });
  if (insertError) {
    // Don't leave an orphaned object in Storage that nothing lists or can
    // ever delete through the app if the metadata row fails to save.
    await supabase.storage.from("site-bills").remove([storagePath]);
    throw new Error(`Could not save the bill record: ${insertError.message}`);
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/customers/${customerId}/sites/${siteId}/edit`);
}

// Hard delete, unlike sites/customers/equipment — a bill upload is a
// supporting document referenced by nothing else in the schema (no BOM
// line, revision, or project points at it), so there's no locked
// historical record at risk the way those soft-deleted rows carry.
// Param order (siteId, customerId, billId) — not billId first — is
// deliberate: it's bound at the page level as
// `deleteSiteBill.bind(null, site.id, customerId)`, leaving `(billId,
// formData)` for the list component to bind per row, same convention
// BomTable/deleteBomLine already use for a delete button inside a `.map()`.
export async function deleteSiteBill(
  siteId: string,
  customerId: string,
  billId: string,
  _formData: FormData
) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canWrite(user.roles)) {
    throw new Error("Your role can't delete bill uploads.");
  }

  const { data: bill, error: fetchError } = await supabase
    .from("site_bill_uploads")
    .select("storage_path")
    .eq("id", billId)
    .maybeSingle();
  if (fetchError) {
    throw new Error(`Could not look up that bill: ${fetchError.message}`);
  }

  const { error: deleteRowError } = await supabase.from("site_bill_uploads").delete().eq("id", billId);
  if (deleteRowError) {
    throw new Error(`Could not delete the bill record: ${deleteRowError.message}`);
  }

  if (bill?.storage_path) {
    await supabase.storage.from("site-bills").remove([bill.storage_path]);
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/customers/${customerId}/sites/${siteId}/edit`);
}

export async function createContact(customerId: string, formData: FormData) {
  const supabase = await createClient();

  const payload = {
    customer_id: customerId,
    full_name: String(formData.get("full_name") ?? "").trim(),
    role_title: String(formData.get("role_title") ?? "").trim() || null,
    mobile: String(formData.get("mobile") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    is_primary: formData.get("is_primary") === "on",
  };

  const { error } = await supabase.from("contacts").insert(payload);
  if (error) {
    throw new Error(`Could not add contact: ${error.message}`);
  }

  revalidatePath(`/customers/${customerId}`);
}

export async function importCustomersCsv(formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canWrite(user.roles)) {
    throw new Error("Your role can't import customers.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/customers/import?error=" + encodeURIComponent("Choose a CSV file first."));
  }

  const text = await (file as File).text();
  const records = parseCsvToRecords(text);

  if (records.length === 0) {
    redirect(
      "/customers/import?error=" +
        encodeURIComponent("That file has no data rows (or the header row couldn't be read).")
    );
  }

  let created = 0;
  const issues: ParseIssue[] = [];

  // Sequential on purpose: next_number() row-locks a shared counter, so
  // parallel inserts would just contend on the same lock anyway, and this
  // keeps per-row error handling simple for what's normally a few dozen to
  // a few hundred rows.
  for (let i = 0; i < records.length; i++) {
    const rowNumber = i + 2; // header is row 1
    const { row, issue } = parseCustomerRecord(records[i], rowNumber);
    if (issue) {
      issues.push(issue);
      continue;
    }
    if (!row) continue;

    const { data: customerNo, error: numError } = await supabase.rpc("next_number", {
      p_code: "customer",
    });
    if (numError) {
      issues.push({ row: rowNumber, reason: `Could not allocate a customer number: ${numError.message}` });
      continue;
    }

    const { data: customer, error: insertError } = await supabase
      .from("customers")
      .insert({
        customer_no: customerNo as string,
        customer_name: row.customerName,
        company_name: row.companyName,
        customer_type: row.customerType,
        industry: row.industry,
        billing_address: row.billingAddress,
        city: row.city,
        province: row.province,
        notes: row.notes,
        lead_source: row.leadSource as LeadSource,
        lead_source_detail: row.leadSourceDetail,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !customer) {
      issues.push({ row: rowNumber, reason: `Could not create customer: ${insertError?.message ?? "unknown error"}` });
      continue;
    }

    created++;

    if (row.mobile || row.email) {
      const { error: contactError } = await supabase.from("contacts").insert({
        customer_id: customer.id,
        full_name: row.contactFullName || row.customerName,
        mobile: row.mobile,
        email: row.email,
        is_primary: true,
      });
      if (contactError) {
        issues.push({ row: rowNumber, reason: `Customer created, but contact info couldn't be saved: ${contactError.message}` });
      }
    }
  }

  revalidatePath("/customers");

  const params = new URLSearchParams();
  params.set("created", String(created));
  params.set("skipped", String(issues.length));
  if (issues.length > 0) {
    params.set("issues", JSON.stringify(issues.slice(0, 25)));
  }
  redirect(`/customers/import?${params.toString()}`);
}
