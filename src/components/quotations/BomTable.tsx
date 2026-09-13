"use client";

import { formatNumber, formatPhp } from "@/lib/format";
import { PROPOSAL_GROUPS } from "@/lib/proposal-bom";
import type { VRevisionBomRow } from "@/lib/types";

export function BomTable({
  rows,
  showCost,
  deleteAction,
  updateGroupAction,
}: {
  rows: VRevisionBomRow[];
  showCost: boolean;
  /** Bound server action: (bomLineId: string) => void. Omit to render read-only. */
  deleteAction?: (bomLineId: string) => Promise<void>;
  /** Bound server action: (bomLineId: string, formData) => void. Omit to hide the Proposal-grouping column. */
  updateGroupAction?: (bomLineId: string, formData: FormData) => Promise<void>;
}) {
  const totalSelling = rows.reduce((a, r) => a + r.selling_line_total_php, 0);
  const totalCost = rows.reduce((a, r) => a + (r.line_cost_php ?? 0), 0);
  const canDelete = !!deleteAction;
  const showGroup = !!updateGroupAction;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50 text-xs text-neutral-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">#</th>
            <th className="px-4 py-2.5 font-medium">Category</th>
            <th className="px-4 py-2.5 font-medium">Description</th>
            <th className="px-4 py-2.5 font-medium">Qty</th>
            {showCost && <th className="px-4 py-2.5 font-medium">Unit cost</th>}
            <th className="px-4 py-2.5 font-medium">Selling price</th>
            <th className="px-4 py-2.5 font-medium">Line total</th>
            {showGroup && <th className="px-4 py-2.5 font-medium">Proposal group</th>}
            {canDelete && <th className="px-4 py-2.5" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {rows.map((r) => (
            <tr key={r.bom_line_id} className={r.show_on_document ? "" : "opacity-50"}>
              <td className="px-4 py-2 text-neutral-400">{r.line_no}</td>
              <td className="px-4 py-2 text-neutral-600">{r.category_name}</td>
              <td className="px-4 py-2">
                <p className="font-medium text-neutral-900">{r.description}</p>
                <p className="text-xs text-neutral-500">
                  {[r.manufacturer, r.model].filter(Boolean).join(" · ")}
                  {r.price_is_stale && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                      stale price
                    </span>
                  )}
                </p>
              </td>
              <td className="px-4 py-2 tabular-nums text-neutral-700">
                {formatNumber(r.quantity)} {r.unit}
              </td>
              {showCost && (
                <td className="px-4 py-2 tabular-nums text-neutral-700">
                  {formatPhp(r.unit_cost_php)}
                </td>
              )}
              <td className="px-4 py-2 tabular-nums text-neutral-700">
                {formatPhp(r.selling_unit_price_php)}
              </td>
              <td className="px-4 py-2 tabular-nums font-medium text-neutral-900">
                {formatPhp(r.selling_line_total_php)}
              </td>
              {showGroup && (
                <td className="px-4 py-2">
                  <form action={updateGroupAction!.bind(null, r.bom_line_id)}>
                    <select
                      name="proposal_group"
                      defaultValue={r.proposal_group ?? ""}
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                      className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-neutral-700"
                    >
                      <option value="">Not on Proposal</option>
                      {PROPOSAL_GROUPS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </form>
                </td>
              )}
              {canDelete && (
                <td className="px-4 py-2 text-right">
                  <form action={deleteAction!.bind(null, r.bom_line_id)}>
                    <button
                      type="submit"
                      className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-red-50 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </form>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-black/10 text-sm font-semibold">
          <tr>
            <td colSpan={showCost ? 4 : 3} />
            {showCost && <td className="px-4 py-2.5 tabular-nums">{formatPhp(totalCost)}</td>}
            <td />
            <td className="px-4 py-2.5 tabular-nums">{formatPhp(totalSelling)}</td>
            {showGroup && <td />}
            {canDelete && <td />}
          </tr>
        </tfoot>
      </table>
      {rows.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-neutral-500">No BOM lines yet.</p>
      )}
    </div>
  );
}
