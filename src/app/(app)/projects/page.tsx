import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, Select } from "@/components/ui";
import { ProjectStatusBadge } from "@/components/quotations/StatusBadge";
import { formatDate, formatNumber, formatPhp } from "@/lib/format";
import type { Customer, Project, ProjectStatus } from "@/lib/types";

const STATUSES: ProjectStatus[] = [
  "awarded",
  "mobilization",
  "in_progress",
  "testing_commissioning",
  "turnover",
  "closed",
  "on_hold",
  "cancelled",
];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = await createClient();

  let query = supabase
    .from("projects")
    .select("*, customers(*)")
    .order("created_at", { ascending: false });

  if (searchParams?.status) {
    query = query.eq("status", searchParams.status);
  }

  const { data, error } = await query;
  const projects = (data ?? []) as (Project & { customers: Customer | null })[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Projects</h1>
        <p className="text-sm text-neutral-500">
          Every awarded quotation becomes a project here, with its BOM frozen at award.
        </p>
      </div>

      <form className="max-w-[200px]">
        <Select name="status" defaultValue={searchParams?.status ?? ""}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </form>

      {error && (
        <Card className="px-5 py-4 text-sm text-red-700">Could not load projects: {error.message}</Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Size</th>
                <th className="px-5 py-3 font-medium">Target completion</th>
                <th className="px-5 py-3 font-medium">Contract value</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <Link href={`/projects/${p.id}`} className="font-medium text-brand-700 hover:underline">
                      {p.project_no}
                    </Link>
                    <p className="text-xs text-neutral-500">{p.project_name}</p>
                  </td>
                  <td className="px-5 py-3 text-neutral-700">{p.customers?.customer_name}</td>
                  <td className="px-5 py-3 tabular-nums text-neutral-600">
                    {p.contracted_capacity_kwp ? `${formatNumber(p.contracted_capacity_kwp, 1)} kWp` : "—"}
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{formatDate(p.target_completion_date)}</td>
                  <td className="px-5 py-3 tabular-nums text-neutral-800">{formatPhp(p.contract_value_php)}</td>
                  <td className="px-5 py-3">
                    <ProjectStatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {projects.length === 0 && !error && (
          <div className="px-5 py-6">
            <EmptyState
              title="No projects yet"
              description="Projects are created automatically when a quotation is marked Won and awarded."
            />
          </div>
        )}
      </Card>
    </div>
  );
}
