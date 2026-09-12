import Link from "next/link";
import { Card, CardHeader } from "@/components/ui";
import { QuotationStatusBadge } from "@/components/quotations/StatusBadge";
import { formatDateTime, humanize } from "@/lib/format";
import type { QuotationRevision, RevisionStatusHistory } from "@/lib/types";

export function RevisionTimeline({
  quotationId,
  revisions,
  currentRevisionId,
  selectedRevNo,
  statusHistory,
}: {
  quotationId: string;
  revisions: QuotationRevision[];
  currentRevisionId: string | null;
  selectedRevNo: number;
  statusHistory: RevisionStatusHistory[];
}) {
  return (
    <Card>
      <CardHeader
        title="Revision history"
        subtitle="Every revision stays visible and read-only once superseded"
      />
      <div className="divide-y divide-black/5">
        {revisions.map((r) => (
          <Link
            key={r.id}
            href={`/quotations/${quotationId}?rev=${r.rev_no}`}
            className={`flex items-center justify-between px-5 py-3 text-sm hover:bg-neutral-50 ${
              r.rev_no === selectedRevNo ? "bg-brand-50" : ""
            }`}
          >
            <div>
              <p className="font-medium text-neutral-900">
                Rev {String(r.rev_no).padStart(2, "0")}
                {r.id === currentRevisionId && (
                  <span className="ml-1.5 text-xs font-normal text-brand-600">(current)</span>
                )}
              </p>
              <p className="text-xs text-neutral-500">
                {r.reason_for_revision || "Initial quotation"}
              </p>
            </div>
            <QuotationStatusBadge status={r.status} />
          </Link>
        ))}
      </div>

      {statusHistory.length > 0 && (
        <div className="border-t border-black/5 px-5 py-4">
          <p className="mb-2 text-xs font-medium text-neutral-500">Status changes — this revision</p>
          <ul className="space-y-2">
            {statusHistory.map((h) => (
              <li key={h.id} className="text-xs text-neutral-600">
                <span className="font-medium text-neutral-800">
                  {h.from_status ? `${humanize(h.from_status)} → ` : ""}
                  {humanize(h.to_status)}
                </span>{" "}
                · {formatDateTime(h.changed_at)}
                {h.note && <span className="block text-neutral-500">“{h.note}”</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
