// Hand-written types mirroring the live MetroGreen Supabase schema
// (project qrcrwkgijvimfpcrgjrf, migrations mgpms_01..mgpms_16).
// Kept as plain interfaces (not a generated Database<> type) so queries
// stay simple: `const { data } = await supabase.from("x").select("*")`
// then `data as X[]`.

export type AppRole =
  | "administrator"
  | "management"
  | "sales"
  | "engineer"
  | "procurement"
  | "viewer";

export type CustomerType =
  | "residential"
  | "commercial"
  | "industrial"
  | "government"
  | "subcontractor_client";

export type LeadSource =
  | "facebook_page"
  | "word_of_mouth"
  | "referral"
  | "email"
  | "walk_in"
  | "website"
  | "other";

export type ServiceType =
  | "supply_and_installation"
  | "design_and_installation"
  | "design_and_project_management"
  | "installation_only"
  | "supply_only"
  | "operation_and_maintenance"
  | "rehabilitation";

export type SystemType = "on_grid" | "hybrid" | "off_grid" | "solar_bess";

export type QuotationStatus =
  | "draft"
  | "for_review"
  | "for_approval"
  | "approved"
  | "submitted"
  | "won"
  | "lost"
  | "expired"
  | "superseded";

export type ProjectStatus =
  | "awarded"
  | "mobilization"
  | "in_progress"
  | "testing_commissioning"
  | "turnover"
  | "closed"
  | "on_hold"
  | "cancelled";

export type PricingMode = "markup_on_cost" | "target_margin";
export type VatTreatment = "exclusive" | "inclusive" | "zero_rated";
export type ServiceEntrance = "single_phase" | "three_phase";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  position_title: string | null;
  mobile: string | null;
  is_active: boolean;
  can_see_profit_override: boolean | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface UserRoleRow {
  user_id: string;
  role: AppRole;
  granted_at: string;
  granted_by: string | null;
}

export interface Customer {
  id: string;
  customer_no: string;
  company_name: string | null;
  customer_name: string;
  customer_type: CustomerType;
  industry: string | null;
  tin: string | null;
  billing_address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  lead_source: LeadSource;
  lead_source_detail: string | null;
  assigned_sales_id: string | null;
  notes: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Contact {
  id: string;
  customer_id: string;
  full_name: string;
  role_title: string | null;
  mobile: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  site_no: string;
  customer_id: string;
  site_name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  installation_type: string | null;
  roof_type: string | null;
  roof_material: string | null;
  roof_orientation_deg: number | null;
  roof_tilt_deg: number | null;
  available_area_sqm: number | null;
  shading_notes: string | null;
  structural_notes: string | null;
  distribution_utility: string | null;
  service_entrance: ServiceEntrance | null;
  service_voltage: number | null;
  main_breaker_amps: number | null;
  transformer_kva: number | null;
  blended_retail_rate_php_kwh: number | null;
  net_metering_export_rate_php_kwh: number | null;
  net_metering_eligible: boolean | null;
  peak_sun_hours_per_day: number | null;
  irradiance_source: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface SiteConsumption {
  id: string;
  site_id: string;
  period_year: number;
  period_month: number;
  kwh: number;
  bill_amount_php: number | null;
  peak_demand_kw: number | null;
  notes: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  contact_person: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  payment_terms: string | null;
  lead_time_days: number | null;
  rating: number | null;
  notes: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentCategory {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_material: boolean;
  is_cost_only: boolean;
  spec_template: Record<string, unknown>;
  is_active: boolean;
}

export interface Equipment {
  id: string;
  sku: string;
  category_id: string;
  manufacturer: string | null;
  model: string | null;
  description: string;
  unit: string;
  warranty_terms: string | null;
  datasheet_url: string | null;
  watt_peak: number | null;
  module_area_sqm: number | null;
  voc_stc: number | null;
  vmp_stc: number | null;
  isc_stc: number | null;
  imp_stc: number | null;
  temp_coeff_voc_pct: number | null;
  temp_coeff_vmp_pct: number | null;
  temp_coeff_pmax_pct: number | null;
  inverter_ac_kw: number | null;
  inverter_v_dc_max: number | null;
  inverter_v_mppt_min: number | null;
  inverter_v_mppt_max: number | null;
  inverter_mppt_count: number | null;
  inverter_efficiency: number | null;
  inverter_phase: ServiceEntrance | null;
  battery_nameplate_kwh: number | null;
  battery_usable_kwh: number | null;
  battery_dod: number | null;
  battery_voltage: number | null;
  battery_chemistry: string | null;
  battery_cycles: number | null;
  specs: Record<string, unknown>;
  is_active: boolean;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface EquipmentPrice {
  id: string;
  equipment_id: string;
  cost_price_php: number;
  default_markup_rate: number;
  supplier_id: string | null;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  source_note: string | null;
  is_estimate: boolean;
  created_by: string | null;
  created_at: string;
}

export interface EquipmentCurrentPriceView {
  id: string;
  sku: string;
  category_id: string;
  category_code: string;
  category_name: string;
  manufacturer: string | null;
  model: string | null;
  description: string;
  unit: string;
  warranty_terms: string | null;
  watt_peak: number | null;
  module_area_sqm: number | null;
  voc_stc: number | null;
  vmp_stc: number | null;
  temp_coeff_voc_pct: number | null;
  temp_coeff_vmp_pct: number | null;
  inverter_ac_kw: number | null;
  inverter_v_dc_max: number | null;
  inverter_v_mppt_min: number | null;
  inverter_efficiency: number | null;
  battery_nameplate_kwh: number | null;
  battery_usable_kwh: number | null;
  battery_dod: number | null;
  is_active: boolean;
  specs: Record<string, unknown>;
  price_record_id: string | null;
  cost_price_php: number | null;
  default_markup_rate: number | null;
  supplier_id: string | null;
  price_effective_from: string | null;
  price_is_estimate: boolean | null;
  price_age_days: number | null;
  price_is_stale: boolean | null;
}

export interface Quotation {
  id: string;
  quotation_no: string;
  customer_id: string;
  site_id: string | null;
  project_name: string;
  service_type: ServiceType;
  system_type: SystemType;
  assigned_sales_id: string | null;
  assigned_engineer_id: string | null;
  current_revision_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface QuotationRevision {
  id: string;
  quotation_id: string;
  rev_no: number;
  rev_label: string | null;
  status: QuotationStatus;
  is_current: boolean;
  reason_for_revision: string | null;
  price_date: string;
  quotation_date: string;
  validity_days: number;
  valid_until: string | null;
  payment_terms: string | null;
  delivery_timeline: string | null;
  warranty_terms: string | null;
  scope_of_work: string | null;
  inclusions: string | null;
  exclusions: string | null;
  terms_conditions: string | null;
  net_metering_note: string | null;
  prepared_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  lost_reason: string | null;
  superseded_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface RevisionConfiguration {
  revision_id: string;
  module_equipment_id: string | null;
  module_quantity: number | null;
  dc_capacity_kwp: number | null;
  modules_per_string: number | null;
  string_count: number | null;
  inverter_equipment_id: string | null;
  inverter_quantity: number | null;
  inverter_ac_kw_total: number | null;
  dc_ac_ratio: number | null;
  battery_equipment_id: string | null;
  battery_quantity: number | null;
  battery_nameplate_kwh_total: number | null;
  battery_usable_kwh_total: number | null;
  critical_load_kw: number | null;
  required_backup_hours: number | null;
  mounting_type: string | null;
  mounting_notes: string | null;
  monitoring_system: string | null;
  protection_notes: string | null;
  bos_notes: string | null;
  accessories_notes: string | null;
  peak_sun_hours_used: number | null;
  performance_ratio_used: number | null;
  annual_degradation_used: number | null;
  monthly_distribution: number[] | null;
  analysis_years: number | null;
  annual_kwh_year1: number | null;
  monthly_kwh: number[] | null;
  lifetime_kwh: number | null;
  self_consumed_kwh_year1: number | null;
  exported_kwh_year1: number | null;
  annual_savings_year1_php: number | null;
  co2_avoided_kg_year1: number | null;
  simple_payback_years: number | null;
  roi_pct: number | null;
  npv_php: number | null;
  irr_pct: number | null;
  lcoe_php_per_kwh: number | null;
  required_area_sqm: number | null;
  calc_inputs: Record<string, unknown>;
  calc_outputs: Record<string, unknown>;
  calc_engine_version: string | null;
  validation_results: Record<string, unknown>;
  validation_passed: boolean;
  validation_override_by: string | null;
  validation_override_reason: string | null;
  validation_override_at: string | null;
  updated_at: string;
}

export interface RevisionBomLine {
  id: string;
  revision_id: string;
  line_no: number;
  category_id: string;
  equipment_id: string | null;
  description: string;
  manufacturer: string | null;
  model: string | null;
  quantity: number;
  unit: string;
  selling_unit_price_php: number;
  selling_line_total_php: number;
  show_on_document: boolean;
  notes: string | null;
  created_at: string;
}

export interface RevisionBomLineCost {
  bom_line_id: string;
  revision_id: string;
  unit_cost_php: number;
  line_cost_php: number;
  markup_rate: number;
  supplier_id: string | null;
  price_record_id: string | null;
  price_is_estimate: boolean;
  created_at: string;
}

export interface RevisionCosting {
  revision_id: string;
  pricing_mode: PricingMode;
  markup_rate: number | null;
  target_gross_margin: number | null;
  direct_material_cost_php: number;
  labor_cost_php: number;
  logistics_cost_php: number;
  engineering_cost_php: number;
  permits_cost_php: number;
  civil_works_cost_php: number;
  other_cost_php: number;
  contingency_rate: number;
  contingency_amount_php: number;
  total_project_cost_php: number;
  min_margin_required: number | null;
  cost_breakdown_by_category: Record<string, number>;
  updated_at: string;
}

export interface RevisionMargin {
  revision_id: string;
  gross_profit_php: number;
  gross_margin_pct: number;
  min_margin_required: number;
  margin_compliant: boolean;
  margin_override_by: string | null;
  margin_override_reason: string | null;
  margin_override_at: string | null;
  updated_at: string;
}

export interface RevisionPricing {
  revision_id: string;
  vat_treatment: VatTreatment;
  vat_rate: number;
  selling_price_net_php: number;
  vat_amount_php: number;
  total_contract_price_php: number;
  discount_php: number;
  rounding_note: string | null;
  updated_at: string;
}

export interface RevisionStatusHistory {
  id: number;
  revision_id: string;
  from_status: QuotationStatus | null;
  to_status: QuotationStatus;
  actor_id: string | null;
  note: string | null;
  changed_at: string;
}

export interface Project {
  id: string;
  project_no: string;
  project_name: string;
  customer_id: string;
  site_id: string | null;
  quotation_id: string | null;
  source_revision_id: string | null;
  service_type: ServiceType;
  system_type: SystemType;
  contracted_capacity_kwp: number | null;
  contract_value_php: number | null;
  status: ProjectStatus;
  assigned_sales_id: string | null;
  assigned_engineer_id: string | null;
  project_manager_id: string | null;
  target_start_date: string | null;
  target_completion_date: string | null;
  actual_start_date: string | null;
  actual_completion_date: string | null;
  turnover_date: string | null;
  specifications: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  sequence_no: number;
  name: string;
  description: string | null;
  weight_pct: number | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  completion_pct: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  user_id: string;
  role_on_project: string;
  assigned_from: string | null;
  assigned_to: string | null;
  notes: string | null;
}

export interface ProjectBaselineBom {
  id: string;
  project_id: string;
  line_no: number;
  category_id: string;
  equipment_id: string | null;
  description: string;
  manufacturer: string | null;
  model: string | null;
  budget_quantity: number;
  unit: string;
  budget_unit_cost_php: number;
  budget_line_cost_php: number;
  frozen_at: string;
}

export interface Setting {
  key: string;
  value: unknown;
  data_type: string;
  category: string;
  label: string;
  description: string | null;
  source_note: string | null;
  requires_confirmation: boolean;
  effective_from: string;
  updated_at: string;
  updated_by: string | null;
}

// ---- Views ----

export interface VDashboard {
  total_quotations: number;
  draft_count: number;
  pending_approval_count: number;
  approved_count: number;
  submitted_count: number;
  won_count: number;
  lost_count: number;
  expiring_soon_count: number;
  total_quoted_value_php: number;
  awarded_value_php: number;
  pipeline_value_php: number;
  awarded_kwp: number;
  avg_gross_margin: number | null;
  below_margin_count: number;
}

export interface VQuotationList {
  quotation_id: string;
  quotation_no: string;
  project_name: string;
  service_type: ServiceType;
  system_type: SystemType;
  customer_id: string;
  customer_no: string;
  customer_label: string;
  customer_type: CustomerType;
  site_id: string | null;
  site_name: string | null;
  city: string | null;
  province: string | null;
  revision_id: string;
  rev_no: number;
  rev_label: string | null;
  status: QuotationStatus;
  quotation_date: string;
  valid_until: string | null;
  is_expired: boolean;
  dc_capacity_kwp: number | null;
  annual_kwh_year1: number | null;
  simple_payback_years: number | null;
  total_contract_price_php: number | null;
  vat_treatment: VatTreatment | null;
  total_project_cost_php: number | null;
  gross_profit_php: number | null;
  gross_margin_pct: number | null;
  margin_compliant: boolean | null;
  margin_override_at: string | null;
  salesperson: string | null;
  engineer: string | null;
  revision_count: number;
  created_at: string;
}

export interface VRevisionBomRow {
  bom_line_id: string;
  revision_id: string;
  line_no: number;
  category_code: string;
  category_name: string;
  category_sort: number;
  equipment_id: string | null;
  description: string;
  manufacturer: string | null;
  model: string | null;
  quantity: number;
  unit: string;
  selling_unit_price_php: number;
  selling_line_total_php: number;
  show_on_document: boolean;
  notes: string | null;
  unit_cost_php: number | null;
  line_cost_php: number | null;
  markup_rate: number | null;
  supplier_id: string | null;
  supplier_name: string | null;
  price_record_id: string | null;
  price_is_estimate: boolean | null;
  price_effective_from: string | null;
  price_is_stale: boolean | null;
}

export interface VRevisionFull
  extends Omit<QuotationRevision, "id">,
    Omit<RevisionConfiguration, "revision_id" | "updated_at">,
    Omit<RevisionCosting, "revision_id" | "updated_at" | "min_margin_required">,
    Omit<RevisionMargin, "revision_id" | "updated_at">,
    Omit<RevisionPricing, "revision_id" | "updated_at"> {
  revision_id: string;
  quotation_id: string;
  quotation_no: string;
  project_name: string;
  service_type: ServiceType;
  system_type: SystemType;
  customer_id: string;
  site_id: string | null;
  // RevisionCosting.min_margin_required is nullable (an unset input);
  // RevisionMargin.min_margin_required is the resolved, non-null value
  // actually applied — the view surfaces the latter under this name.
  min_margin_required: number;
  prepared_by_name: string | null;
  reviewed_by_name: string | null;
  approved_by_name: string | null;
}

export interface VSiteConsumptionSummary {
  site_id: string;
  months_recorded: number;
  total_kwh: number;
  total_bill_php: number | null;
  avg_monthly_kwh: number;
  annualised_kwh: number;
  derived_blended_rate_php_kwh: number | null;
  peak_demand_kw: number | null;
}

export interface AuditLogRow {
  id: number;
  table_name: string;
  record_id: string;
  action: string;
  actor_id: string | null;
  actor_label: string | null;
  changed_at: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  reason: string | null;
  context: Record<string, unknown> | null;
}
