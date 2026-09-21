"use client";

import type { SiteBillUpload } from "@/lib/types";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatBytes(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A bill row plus a short-lived signed URL generated at render time by
 * whichever Server Component fetched the list — the bucket is private, so
 * there's no public URL to just read off the row. `signed_url` is null
 * when signing failed (e.g. the object was removed from Storage directly);
 * the row still renders, just without a working "View" link. */
export type SiteBillUploadWithUrl = SiteBillUpload & { signed_url: string | null };

export function SiteBillList({
  bills,
  deleteAction,
  emptyLabel = "No bills uploaded yet.",
}: {
  bills: SiteBillUploadWithUrl[];
  /** Bound server action, still expecting (billId, formData) — siteId/customerId
   * are already bound in at the page. Each row then binds its own billId via
   * `.bind(null, b.id)` below, leaving a plain (formData) => void form action.
   * Omit to render read-only (no delete button) — used on the Load & Sizing
   * tab, which only needs to reference the bills, not manage them. */
  deleteAction?: (billId: string, formData: FormData) => Promise<void>;
  emptyLabel?: string;
}) {
  if (bills.length === 0) {
    return <p className="px-5 py-4 text-sm text-neutral-500">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y divide-black/5">
      {bills.map((b) => {
        const sizeLabel = formatBytes(b.size_bytes);
        return (
          <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-neutral-900">
                {b.period_year && b.period_month
                  ? `${MONTH_NAMES[b.period_month - 1]} ${b.period_year} bill`
                  : b.file_name}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {b.file_name}
                {sizeLabel ? ` · ${sizeLabel}` : ""}
                {b.notes ? ` · ${b.notes}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {b.signed_url ? (
                <a
                  href={b.signed_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                >
                  View
                </a>
              ) : (
                <span className="px-2 py-1 text-xs text-neutral-400">Link unavailable</span>
              )}
              {deleteAction && (
                <form
                  action={deleteAction.bind(null, b.id)}
                  onSubmit={(e) => {
                    if (!confirm(`Delete ${b.file_name}? This can't be undone.`)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-red-50 hover:text-red-700"
                  >
                    Delete
                  </button>
                </form>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
