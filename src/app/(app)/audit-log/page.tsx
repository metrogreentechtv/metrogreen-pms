import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canApprove } from "@/lib/roles";
import { Badge, Card, CardHeader, EmptyState, Select } from "@/components/ui";
import { formatDateTime, humanize } from "@/lib/format";
import type { AuditLogRow } from "@/lib/types";

const actionTones: Record<string, "green" | "blue" | "red" | "amber" | "neutral"> = {
  insert: "green",
  update: "blue",
  delete: "red",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { table?: string };
}) {
  const user = await getCurrentUser();
  if (!user || !canApprove(user.roles)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: tableRows } = await supabase
    .from("audit_log")
    .select("table_name")
    .limit(1000);
  const tables = Array.from(
    new Set((tableRows ?? []).map((r) => r.table_name as string))
  ).sort();

  let query = supabase
    .from("audit_log")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(200);

  if (searchParams?.table) {
    query = query.eq("table_name", searchParams.table);
  }

  const { data, error } = await query;
  const rows = (data ?? []) as AuditLogRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Audit log</h1>
          <p className="text-sm text-neutral-500">
            Every recorded change across the system — most recent 200 entries.
          </p>
        </div>
        <form className="w-48">
          <Select name="table" defaultValue={searchParams?.table ?? ""}>
            <option value="">All tables</option>
            {tables.map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </Select>
        </form>
      </div>

      {error && (
        <Card className="px-5 py-4 text-sm text-red-700">
          Could not load audit log: {error.message}
        </Card>
      )}

      <Card>
        <CardHeader title="Recent activity" subtitle={`${rows.length} entr${rows.length === 1 ? "y" : "ies"}`} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">When</th>
                <th className="px-5 py-2.5 font-medium">Actor</th>
                <th className="px-5 py-2.5 font-medium">Table</th>
                <th className="px-5 py-2.5 font-medium">Action</th>
                <th className="px-5 py-2.5 font-medium">Changed fields</th>
                <th className="px-5 py-2.5 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-5 py-2.5 text-xs text-neutral-500">
                    {formatDateTime(r.changed_at)}
                  </td>
                  <td className="px-5 py-2.5 text-neutral-700">{r.actor_label ?? "System"}</td>
                  <td className="px-5 py-2.5 text-neutral-700">{humanize(r.table_name)}</td>
                  <td className="px-5 py-2.5">
                    <Badge tone={actionTones[r.action] ?? "neutral"}>{r.action}</Badge>
                  </td>
                  <td className="max-w-xs px-5 py-2.5 text-xs text-neutral-500">
                    {r.changed_fields && r.changed_fields.length > 0
                      ? r.changed_fields.join(", ")
                      : "—"}
                  </td>
                  <td className="max-w-xs px-5 py-2.5 text-xs text-neutral-500">
                    {r.reason ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && !error && (
          <div className="px-5 py-6">
            <EmptyState title="No activity recorded yet" />
          </div>
        )}
      </Card>
    </div>
  );
}
