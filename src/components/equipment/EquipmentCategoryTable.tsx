import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { formatNumber, formatPct, formatPhp } from "@/lib/format";
import { EquipmentRowActions } from "@/components/equipment/EquipmentRowActions";
import type { EquipmentCurrentPriceView } from "@/lib/types";

/** One category's worth of the equipment catalog, as a titled table. Shared
 * by both tabs of the Equipment page (Main Materials / Equipments) so the
 * row markup only lives in one place. */
export function EquipmentCategoryTable({
  category,
  rows,
  showCost,
  canManage,
  deleteAction,
}: {
  category: string;
  rows: EquipmentCurrentPriceView[];
  showCost: boolean;
  /** Administrator/management/engineer/procurement — same gate as the price
   * history form on the equipment detail page (canManageEquipment). Shows
   * the edit/delete row actions; the actual write is still enforced by RLS. */
  canManage: boolean;
  /** The unbound deleteEquipment server action, bound per-row to that row's
   * id below — passed down from the page rather than imported here, same
   * convention as every other row-actions setup in this app. */
  deleteAction?: (equipmentId: string, formData: FormData) => void;
}) {
  return (
    <Card>
      <div className="border-b border-black/5 px-5 py-3">
        <h2 className="text-sm font-semibold text-neutral-900">{category}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-500">
            <tr>
              <th className="px-5 py-2.5 font-medium">Description</th>
              <th className="px-5 py-2.5 font-medium">Manufacturer / Model</th>
              <th className="px-5 py-2.5 font-medium">Unit</th>
              <th className="px-5 py-2.5 font-medium">In stock</th>
              {showCost && <th className="px-5 py-2.5 font-medium">Cost</th>}
              {showCost && <th className="px-5 py-2.5 font-medium">Markup</th>}
              <th className="px-5 py-2.5 font-medium">Price status</th>
              {canManage && <th className="px-5 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-neutral-50">
                <td className="px-5 py-2.5">
                  <Link href={`/equipment/${r.id}`} className="font-medium text-brand-700 hover:underline">
                    {r.description}
                  </Link>
                  <p className="text-xs text-neutral-400">{r.sku}</p>
                </td>
                <td className="px-5 py-2.5 text-neutral-600">
                  {[r.manufacturer, r.model].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-5 py-2.5 text-neutral-600">{r.unit}</td>
                <td className="px-5 py-2.5 tabular-nums">
                  {r.quantity_on_hand === null ? (
                    <span className="text-neutral-400">Not tracked</span>
                  ) : r.reorder_point !== null && r.quantity_on_hand <= r.reorder_point ? (
                    <Badge tone="amber">{formatNumber(r.quantity_on_hand)} low</Badge>
                  ) : r.quantity_on_hand === 0 ? (
                    <Badge tone="red">0</Badge>
                  ) : (
                    <span className="text-neutral-800">{formatNumber(r.quantity_on_hand)}</span>
                  )}
                </td>
                {showCost && (
                  <td className="px-5 py-2.5 tabular-nums text-neutral-800">
                    {formatPhp(r.cost_price_php)}
                  </td>
                )}
                {showCost && (
                  <td className="px-5 py-2.5 tabular-nums text-neutral-800">
                    {formatPct(r.default_markup_rate)}
                  </td>
                )}
                <td className="px-5 py-2.5">
                  {r.price_record_id ? (
                    r.price_is_stale ? (
                      <Badge tone="amber">Stale · {formatNumber(r.price_age_days, 0)}d</Badge>
                    ) : (
                      <Badge tone="green">Current</Badge>
                    )
                  ) : (
                    <Badge tone="red">No price on file</Badge>
                  )}
                </td>
                {canManage && deleteAction && (
                  <td className="px-5 py-2.5">
                    <EquipmentRowActions
                      equipmentId={r.id}
                      equipmentName={r.description}
                      deleteAction={deleteAction.bind(null, r.id)}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
