import type { AppRole } from "@/lib/types";

/**
 * UI-level role gating, mirrored exactly from the Postgres helpers in
 * schema `app` (can_see_cost, can_see_profit, can_approve, can_edit_bom,
 * can_write — see migration mgpms_11/12). This is UX only: the real
 * security boundary is Row-Level Security in the database. If a profile
 * override or a settings flag changes server-side, these mirrors can go
 * briefly stale — RLS still enforces the true rule regardless of what a
 * button shows.
 */

export function hasRole(roles: AppRole[], role: AppRole): boolean {
  return roles.includes(role);
}

export function isAdmin(roles: AppRole[]): boolean {
  return hasRole(roles, "administrator");
}

// app.can_see_cost(): administrator, management, engineer, procurement
export function canSeeCost(roles: AppRole[]): boolean {
  return roles.some((r) =>
    (["administrator", "management", "engineer", "procurement"] as AppRole[]).includes(r)
  );
}

// Projects module only: administrator, management, procurement can see
// budget cost and contract value on an awarded project. Deliberately
// narrower than canSeeCost() (which also includes engineer, for the
// quoting stage) — a project engineer executing the job needs the BOM
// quantities, client/site info, and savings/ROI figures, not pricing.
// This is a UI-level narrowing on top of the DB's real RLS boundary
// (which still permits "engineer" to see cost, matching can_see_cost());
// it hides these figures in this view rather than adding a new
// database-level restriction.
export function canSeeProjectFinancials(roles: AppRole[]): boolean {
  return roles.some((r) =>
    (["administrator", "management", "procurement"] as AppRole[]).includes(r)
  );
}

// app.can_see_profit(): administrator/management always; engineer only if
// settings["permissions.engineer_sees_profit"] is true; OR any user whose
// user_profiles.can_see_profit_override is true.
export function canSeeProfit(
  roles: AppRole[],
  opts: { engineerSeesProfitSetting?: boolean; profileOverride?: boolean | null } = {}
): boolean {
  if (roles.includes("administrator") || roles.includes("management")) return true;
  if (roles.includes("engineer") && opts.engineerSeesProfitSetting) return true;
  if (opts.profileOverride) return true;
  return false;
}

// app.can_approve(): administrator, management
export function canApprove(roles: AppRole[]): boolean {
  return roles.some((r) => (["administrator", "management"] as AppRole[]).includes(r));
}

// app.can_edit_bom(): administrator, engineer (management is read/approve, not edit)
export function canEditBom(roles: AppRole[]): boolean {
  return roles.some((r) => (["administrator", "engineer"] as AppRole[]).includes(r));
}

// app.can_write(): anyone except a pure viewer
export function canWrite(roles: AppRole[]): boolean {
  return roles.some((r) =>
    (["administrator", "management", "sales", "engineer", "procurement"] as AppRole[]).includes(r)
  );
}

// app.set_equipment_price() requires can_see_cost() — same set.
export const canManageEquipment = canSeeCost;

export function roleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    administrator: "Administrator",
    management: "Management",
    sales: "Sales",
    engineer: "Engineer",
    procurement: "Procurement",
    viewer: "Viewer",
  };
  return labels[role] ?? role;
}
