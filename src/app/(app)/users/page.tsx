import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canApprove, isAdmin, roleLabel } from "@/lib/roles";
import { Badge, Card, CardHeader, Select } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { AppRole, UserProfile, UserRoleRow } from "@/lib/types";
import { addRole, removeRole, setActive } from "./actions";

const ALL_ROLES: AppRole[] = [
  "administrator",
  "management",
  "sales",
  "engineer",
  "procurement",
  "viewer",
];

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user || !canApprove(user.roles)) {
    redirect("/dashboard");
  }
  const canEdit = isAdmin(user.roles);

  const supabase = await createClient();
  const [{ data: profiles }, { data: roleRows }] = await Promise.all([
    supabase.from("user_profiles").select("*").order("full_name"),
    supabase.from("user_roles").select("*"),
  ]);

  const profileList = (profiles ?? []) as UserProfile[];
  const roleList = (roleRows ?? []) as UserRoleRow[];
  const rolesByUser = roleList.reduce<Record<string, AppRole[]>>((acc, r) => {
    (acc[r.user_id] ??= []).push(r.role);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Users</h1>
        <p className="text-sm text-neutral-500">
          Roles and access for people who can sign in to the system.
        </p>
      </div>

      <Card className="border-brand-200 bg-brand-50 px-5 py-3 text-xs text-brand-800">
        New logins are created in the Supabase dashboard (Authentication → Users),
        not here — this page manages roles and status for accounts that already
        exist. Ask an administrator to create the login, then assign roles below.
      </Card>

      <Card>
        <CardHeader title="Accounts" subtitle={`${profileList.length} user(s)`} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Email</th>
                <th className="px-5 py-2.5 font-medium">Position</th>
                <th className="px-5 py-2.5 font-medium">Roles</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {profileList.map((p) => {
                const myRoles = rolesByUser[p.id] ?? [];
                const availableRoles = ALL_ROLES.filter((r) => !myRoles.includes(r));
                return (
                  <tr key={p.id} className="align-top hover:bg-neutral-50">
                    <td className="px-5 py-3 font-medium text-neutral-900">
                      {p.full_name}
                      {p.mobile && <p className="text-xs font-normal text-neutral-400">{p.mobile}</p>}
                    </td>
                    <td className="px-5 py-3 text-neutral-600">{p.email}</td>
                    <td className="px-5 py-3 text-neutral-600">{p.position_title ?? "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {myRoles.length === 0 && (
                          <span className="text-xs text-neutral-400">No roles assigned</span>
                        )}
                        {myRoles.map((r) => (
                          <span key={r} className="inline-flex items-center gap-1">
                            <Badge tone="brand">{roleLabel(r)}</Badge>
                            {canEdit && (
                              <form action={removeRole.bind(null, p.id, r)}>
                                <button
                                  type="submit"
                                  title={`Remove ${roleLabel(r)}`}
                                  className="text-xs text-neutral-400 hover:text-red-600"
                                >
                                  ×
                                </button>
                              </form>
                            )}
                          </span>
                        ))}
                      </div>
                      {canEdit && availableRoles.length > 0 && (
                        <form
                          action={addRole.bind(null, p.id)}
                          className="mt-2 flex items-center gap-1.5"
                        >
                          <Select name="role" defaultValue="" className="h-7 w-36 py-0 text-xs">
                            <option value="" disabled>
                              + Add role…
                            </option>
                            {availableRoles.map((r) => (
                              <option key={r} value={r}>
                                {roleLabel(r)}
                              </option>
                            ))}
                          </Select>
                          <button
                            type="submit"
                            className="rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700"
                          >
                            Add
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {p.is_active ? (
                        <Badge tone="green">Active</Badge>
                      ) : (
                        <Badge tone="neutral">Inactive</Badge>
                      )}
                      {canEdit && (
                        <form action={setActive.bind(null, p.id, !p.is_active)} className="mt-1.5">
                          <button
                            type="submit"
                            className="text-xs text-neutral-400 underline hover:text-neutral-700"
                          >
                            {p.is_active ? "Deactivate" : "Reactivate"}
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-neutral-500">
                      {formatDate(p.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
