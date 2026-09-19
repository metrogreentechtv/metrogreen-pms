import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canEditBom } from "@/lib/roles";
import { Badge, Button, Card, CardHeader, Field, Input, LinkButton, Select, Textarea } from "@/components/ui";
import { formatPhp } from "@/lib/format";
import { proposalGroupLabel } from "@/lib/proposal-bom";
import { TemplateLineForm } from "@/components/bom-templates/TemplateLineForm";
import { EditLineQtyPrice } from "@/components/bom-templates/EditLineQtyPrice";
import { DeleteTemplateLineButton } from "@/components/bom-templates/DeleteTemplateLineButton";
import { DeleteTemplateButton } from "@/components/bom-templates/DeleteTemplateButton";
import type { BomTemplate, BomTemplateLine, EquipmentCategory, EquipmentCurrentPriceView } from "@/lib/types";
import { addTemplateLine, deleteTemplate, deleteTemplateLine, updateTemplate, updateTemplateLine } from "../actions";

const SYSTEM_TYPES = [
  ["", "Any system type"],
  ["on_grid", "On-grid"],
  ["hybrid", "Hybrid"],
  ["off_grid", "Off-grid"],
  ["solar_bess", "Solar + BESS"],
] as const;

export default async function BomTemplateDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !canEditBom(user.roles)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: template }, { data: lineRows }, { data: categories }, { data: equipment }] = await Promise.all([
    supabase.from("bom_templates").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("bom_template_lines").select("*").eq("template_id", params.id).order("line_no"),
    supabase.from("equipment_categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("v_equipment_current_price").select("*").eq("is_active", true).order("description"),
  ]);

  if (!template) notFound();

  const t = template as BomTemplate;
  const lines = (lineRows ?? []) as BomTemplateLine[];
  const categoryList = (categories ?? []) as EquipmentCategory[];
  const equipmentList = (equipment ?? []) as EquipmentCurrentPriceView[];
  const categoryName = (id: string) => categoryList.find((c) => c.id === id)?.name ?? "—";

  const boundUpdate = updateTemplate.bind(null, t.id);
  const boundDelete = deleteTemplate.bind(null, t.id);
  const boundAddLine = addTemplateLine.bind(null, t.id);
  const boundDeleteLine = deleteTemplateLine.bind(null, t.id);
  const boundUpdateLine = updateTemplateLine.bind(null, t.id);
  const totalCost = lines.reduce((sum, l) => sum + l.quantity * l.unit_price_php, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-brand-600">BOM Template</p>
          <h1 className="text-xl font-semibold text-neutral-900">{t.name}</h1>
        </div>
        <LinkButton href="/bom-templates" variant="secondary" size="sm">
          Back to templates
        </LinkButton>
      </div>

      <Card>
        <CardHeader title="Template details" action={<Badge tone={t.is_active ? "green" : "neutral"}>{t.is_active ? "Active" : "Inactive"}</Badge>} />
        <form action={boundUpdate} className="space-y-4 px-5 py-5">
          <Field label="Template name">
            <Input name="name" required defaultValue={t.name} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="System size (kWp)">
              <Input name="system_size_kwp" type="number" step="0.01" required defaultValue={t.system_size_kwp} />
            </Field>
            <Field label="System type">
              <Select name="system_type" defaultValue={t.system_type ?? ""}>
                {SYSTEM_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Description (optional)">
            <Textarea name="description" rows={2} defaultValue={t.description ?? ""} />
          </Field>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="is_active" defaultChecked={t.is_active} className="rounded" />
            Active (selectable when applying a template to a quotation)
          </label>

          <div className="flex items-center justify-between gap-2 pt-2">
            <DeleteTemplateButton name={t.name} deleteAction={boundDelete} />
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Line items" subtitle={`${lines.length} line(s)`} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Item no.</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Qty · Unit price</th>
                <th className="px-4 py-2.5 font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2 text-neutral-400">{l.line_no}</td>
                  <td className="px-4 py-2">
                    <p className="font-medium text-neutral-900">{l.description}</p>
                    {(l.manufacturer || l.model) && (
                      <p className="text-xs text-neutral-500">{[l.manufacturer, l.model].filter(Boolean).join(" · ")}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-neutral-600">
                    {categoryName(l.category_id)}
                    <p className="text-xs text-neutral-400">
                      {l.default_proposal_group ? proposalGroupLabel(l.default_proposal_group) : "Not on Proposal"}
                    </p>
                  </td>
                  <td className="px-4 py-2">
                    <EditLineQtyPrice
                      quantity={l.quantity}
                      unit={l.unit}
                      unitPrice={l.unit_price_php}
                      action={boundUpdateLine.bind(null, l.id)}
                    />
                  </td>
                  <td className="px-4 py-2 tabular-nums font-medium text-neutral-900">
                    {formatPhp(l.quantity * l.unit_price_php)}
                  </td>
                  <td className="px-4 py-2">
                    {l.is_major ? (
                      <Badge tone="brand">Major equipment</Badge>
                    ) : (
                      <Badge tone="neutral">Fixed</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <DeleteTemplateLineButton
                      description={l.description}
                      deleteAction={boundDeleteLine.bind(null, l.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            {lines.length > 0 && (
              <tfoot className="border-t border-black/10 text-sm font-semibold">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-right text-neutral-600">
                    Total cost
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{formatPhp(totalCost)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
          {lines.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-neutral-500">
              No line items yet — add the major-equipment slots and standard items below.
            </p>
          )}
        </div>
        <details className="border-t border-black/5 px-5 py-4">
          <summary className="cursor-pointer text-sm font-medium text-brand-700">+ Add line item</summary>
          <div className="mt-4">
            <TemplateLineForm categories={categoryList} equipment={equipmentList} action={boundAddLine} />
          </div>
        </details>
      </Card>
    </div>
  );
}
