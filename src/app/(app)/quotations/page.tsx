import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, Input, LinkButton, Select } from "@/components/ui";
import { QuotationStatusBadge } from "@/components/quotations/StatusBadge";
import { formatDate, formatNumber, formatPhp } from "@/lib/format";
import type { QuotationStatus, VQuotationList } from "@/lib/types";

const STATUSES: QuotationStatus[] = [
  "draft",
  "for_review",
  "for_approval",
  "approved",
  "submitted",
  "won",
  "lost",
  "expired",
  "superseded",
];

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const supabase = await createClient();
  const q = searchParams?.q?.trim();

  let query = supabase
    .from("v_quotation_list")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (searchParams?.status) {
    query = query.eq("status", searchParams.status);
  }
  if (q) {
    query = query.or(
      `quotation_no.ilike.%${q}%,customer_label.ilike.%${q}%,project_name.ilike.%${q}%,salesperson.ilike.%${q}%,city.ilike.%${q}%,province.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  const quotations = (data ?? []) as VQuotationList[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Quotations</h1>
          <p className="text-sm text-neutral-500">
            Search by customer, quotation number, salesperson, size, or location.
          </p>
        </div>
        <LinkButton href="/quotations/new">+ New quotation</LinkButton>
      </div>

      <form className="flex flex-wrap gap-3">
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search…"
          className="max-w-sm"
        />
        <Select name="status" defaultValue={searchParams?.status ?? ""} className="max-w-[180px]">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </form>

      {error && (
        <Card className="px-5 py-4 text-sm text-red-700">
          Could not load quotations: {error.message}
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">Quotation</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Size</th>
                <th className="px-5 py-3 font-medium">Salesperson</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Value</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {quotations.map((q) => (
                <tr key={q.revision_id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <Link href={`/quotations/${q.quotation_id}`} className="font-medium text-brand-700 hover:underline">
                      {q.quotation_no}
                    </Link>
                    <p className="text-xs text-neutral-500">
                      Rev {q.rev_no} · {q.project_name}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-neutral-800">{q.customer_label}</p>
                    <p className="text-xs text-neutral-500">
                      {[q.city, q.province].filter(Boolean).join(", ") || "—"}
                    </p>
                  </td>
                  <td className="px-5 py-3 tabular-nums text-neutral-600">
                    {q.dc_capacity_kwp ? `${formatNumber(q.dc_capacity_kwp, 1)} kWp` : "—"}
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{q.salesperson ?? "—"}</td>
                  <td className="px-5 py-3 text-neutral-600">{formatDate(q.quotation_date)}</td>
                  <td className="px-5 py-3 tabular-nums text-neutral-800">
                    {formatPhp(q.total_contract_price_php)}
                  </td>
                  <td className="px-5 py-3">
                    <QuotationStatusBadge status={q.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {quotations.length === 0 && !error && (
          <div className="px-5 py-6">
            <EmptyState title="No quotations found" description="Try a different search or filter." />
          </div>
        )}
      </Card>
    </div>
  );
}
