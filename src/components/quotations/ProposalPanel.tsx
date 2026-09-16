import { Card, CardHeader, LinkButton } from "@/components/ui";
import { formatNumber, formatPhp } from "@/lib/format";
import { buildProposalLines, untaggedLines } from "@/lib/proposal-bom";
import type { VRevisionBomRow } from "@/lib/types";

export function ProposalPanel({
  bom,
  quotationId,
  bankName,
  bankAccountName,
  bankAccountNumber,
  bankBranch,
}: {
  bom: VRevisionBomRow[];
  quotationId: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
}) {
  const lines = buildProposalLines(bom);
  const untagged = untaggedLines(bom);
  const total = lines.reduce((a, l) => a + l.selling_line_total_php, 0);
  const hasBankDetails = !!(bankName || bankAccountName || bankAccountNumber);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Proposal BOM preview"
          subtitle="Panel / inverter / battery itemized; mounting, wiring, protection, and engineering/logistics/installation shown as 1 lot each; net metering, mobilization, roof-type mounting cost, and additional works itemized as add-ons"
        />
        {untagged.length > 0 && (
          <div className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            {untagged.length} BOM line(s) aren&apos;t tagged for the Proposal yet and won&apos;t appear
            below — set a &ldquo;Proposal grouping&rdquo; for each on the BOQ tab.
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="mt-2 w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-5 py-2 font-medium">Item</th>
                <th className="px-5 py-2 font-medium">Description</th>
                <th className="px-5 py-2 font-medium">Qty</th>
                <th className="px-5 py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="px-5 py-2 text-neutral-500">{l.groupLabel}</td>
                  <td className="px-5 py-2">
                    <p className="font-medium text-neutral-900">{l.description}</p>
                    {l.mode === "itemized" && (l.manufacturer || l.model) && (
                      <p className="text-xs text-neutral-500">{[l.manufacturer, l.model].filter(Boolean).join(" · ")}</p>
                    )}
                  </td>
                  <td className="px-5 py-2 tabular-nums text-neutral-700">
                    {formatNumber(l.quantity)} {l.unit}
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums font-medium">{formatPhp(l.selling_line_total_php)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-black/10 text-sm font-semibold">
              <tr>
                <td colSpan={3} className="px-5 py-2.5">Total</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{formatPhp(total)}</td>
              </tr>
            </tfoot>
          </table>
          {lines.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-neutral-500">
              No lines tagged for the Proposal yet.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Bank details" subtitle="Printed on the proposal for payment — edit in Settings" />
        <div className="px-5 py-4 text-sm text-neutral-700">
          {hasBankDetails ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Detail label="Bank" value={bankName} />
              <Detail label="Account name" value={bankAccountName} />
              <Detail label="Account number" value={bankAccountNumber} />
              <Detail label="Branch" value={bankBranch} />
            </div>
          ) : (
            <p className="text-neutral-500">
              Not set — add them under <span className="font-medium">Settings → Company</span> to have
              them appear on the printed proposal.
            </p>
          )}
        </div>
      </Card>

      <div className="flex justify-end">
        <LinkButton href={`/quotations/${quotationId}/proposal`} variant="secondary">
          Print proposal
        </LinkButton>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className="font-medium text-neutral-800">{value || "—"}</p>
    </div>
  );
}
