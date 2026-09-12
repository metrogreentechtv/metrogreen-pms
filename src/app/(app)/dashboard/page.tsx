import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardHeader, EmptyState, LinkButton } from "@/components/ui";
import { QuotationStatusBadge } from "@/components/quotations/StatusBadge";
import { formatDate, formatNumber, formatPhp, formatPct } from "@/lib/format";
import type { VDashboard, VQuotationList } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: dash }, { data: recent }, { data: pending }] = await Promise.all([
    supabase.from("v_dashboard").select("*").maybeSingle(),
    supabase
      .from("v_quotation_list")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("v_quotation_list")
      .select("*")
      .in("status", ["for_review", "for_approval"])
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const d = dash as VDashboard | null;
  const recentQuotes = (recent ?? []) as VQuotationList[];
  const pendingApprovals = (pending ?? []) as VQuotationList[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500">
            Live pipeline and approval status across all quotations.
          </p>
        </div>
        <LinkButton href="/quotations/new">+ New quotation</LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total quotations" value={formatNumber(d?.total_quotations, 0)} />
        <StatCard
          label="Draft"
          value={formatNumber(d?.draft_count, 0)}
          tone="neutral"
        />
        <StatCard
          label="Pending approval"
          value={formatNumber(d?.pending_approval_count, 0)}
          tone="amber"
        />
        <StatCard label="Approved" value={formatNumber(d?.approved_count, 0)} tone="brand" />
        <StatCard label="Submitted" value={formatNumber(d?.submitted_count, 0)} />
        <StatCard label="Won" value={formatNumber(d?.won_count, 0)} tone="brand" />
        <StatCard label="Lost" value={formatNumber(d?.lost_count, 0)} tone="red" />
        <StatCard
          label="Expiring soon"
          value={formatNumber(d?.expiring_soon_count, 0)}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Pipeline value"
          value={formatPhp(d?.pipeline_value_php)}
          hint="Open (non-won, non-lost) quotations"
        />
        <StatCard
          label="Awarded value"
          value={formatPhp(d?.awarded_value_php)}
          hint={`${formatNumber(d?.awarded_kwp, 1)} kWp awarded`}
        />
        <StatCard
          label="Avg. gross margin"
          value={formatPct(d?.avg_gross_margin)}
          hint={
            d?.below_margin_count
              ? `${d.below_margin_count} revision(s) below minimum margin`
              : "All revisions at or above minimum margin"
          }
          tone={d?.below_margin_count ? "amber" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Pending approvals"
            subtitle="Revisions waiting on review or approval"
          />
          <div className="divide-y divide-black/5">
            {pendingApprovals.length === 0 && (
              <div className="px-5 py-6">
                <EmptyState title="Nothing waiting on you right now" />
              </div>
            )}
            {pendingApprovals.map((q) => (
              <Link
                key={q.revision_id}
                href={`/quotations/${q.quotation_id}`}
                className="flex items-center justify-between px-5 py-3 text-sm hover:bg-neutral-50"
              >
                <div>
                  <p className="font-medium text-neutral-900">
                    {q.quotation_no} · Rev {q.rev_no}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {q.customer_label} — {q.project_name}
                  </p>
                </div>
                <QuotationStatusBadge status={q.status} />
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent quotations" subtitle="Latest activity" />
          <div className="divide-y divide-black/5">
            {recentQuotes.length === 0 && (
              <div className="px-5 py-6">
                <EmptyState title="No quotations yet" />
              </div>
            )}
            {recentQuotes.map((q) => (
              <Link
                key={q.revision_id}
                href={`/quotations/${q.quotation_id}`}
                className="flex items-center justify-between px-5 py-3 text-sm hover:bg-neutral-50"
              >
                <div>
                  <p className="font-medium text-neutral-900">{q.quotation_no}</p>
                  <p className="text-xs text-neutral-500">
                    {q.customer_label} · {formatDate(q.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-neutral-700">
                    {formatPhp(q.total_contract_price_php)}
                  </p>
                  <QuotationStatusBadge status={q.status} />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
