import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canEditBom } from "@/lib/roles";
import { Badge, Card, EmptyState, LinkButton } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { BomTemplate } from "@/lib/types";

export default async function BomTemplatesPage() {
  const user = await getCurrentUser();
  if (!user || !canEditBom(user.roles)) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bom_templates")
    .select("*, bom_template_lines(count)")
    .order("system_size_kwp");

  const templates = (data ?? []) as (BomTemplate & { bom_template_lines: { count: number }[] })[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">BOM Templates</h1>
          <p className="text-sm text-neutral-500">
            Standard bill-of-materials by system size — apply one to a quotation, then pick the major
            equipment and add any special inclusions on top.
          </p>
        </div>
        <LinkButton href="/bom-templates/new">+ New template</LinkButton>
      </div>

      {error && (
        <Card className="px-5 py-4 text-sm text-red-700">Could not load templates: {error.message}</Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">System size</th>
                <th className="px-5 py-3 font-medium">System type</th>
                <th className="px-5 py-3 font-medium">Lines</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <Link href={`/bom-templates/${t.id}`} className="font-medium text-brand-700 hover:underline">
                      {t.name}
                    </Link>
                    {t.description && <p className="text-xs text-neutral-500">{t.description}</p>}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-neutral-700">
                    {formatNumber(t.system_size_kwp, 1)} kWp
                  </td>
                  <td className="px-5 py-3 text-neutral-600">
                    {t.system_type ? t.system_type.replace(/_/g, " ") : "Any"}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-neutral-600">
                    {t.bom_template_lines?.[0]?.count ?? 0}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={t.is_active ? "green" : "neutral"}>{t.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {templates.length === 0 && !error && (
          <div className="px-5 py-6">
            <EmptyState
              title="No BOM templates yet"
              description="Create a standard BOM for each system-size tier (3kW, 5kW, 6kW, 8kW, 10kW, 12kW…) so sales can apply it straight to a quotation."
              action={<LinkButton href="/bom-templates/new">+ New template</LinkButton>}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
