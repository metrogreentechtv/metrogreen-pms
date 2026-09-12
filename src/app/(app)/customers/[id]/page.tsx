import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, CardHeader, EmptyState, Field, Input, Select, Button, LinkButton } from "@/components/ui";
import { QuotationStatusBadge } from "@/components/quotations/StatusBadge";
import { formatDate, formatPhp, humanize } from "@/lib/format";
import type { Contact, Customer, Site, VQuotationList } from "@/lib/types";
import { createContact, createSite } from "../actions";

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const [{ data: customer }, { data: sites }, { data: contacts }, { data: quotations }] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", params.id).maybeSingle(),
      supabase
        .from("sites")
        .select("*")
        .eq("customer_id", params.id)
        .is("deleted_at", null)
        .order("created_at"),
      supabase
        .from("contacts")
        .select("*")
        .eq("customer_id", params.id)
        .is("deleted_at", null)
        .order("is_primary", { ascending: false }),
      supabase
        .from("v_quotation_list")
        .select("*")
        .eq("customer_id", params.id)
        .order("created_at", { ascending: false }),
    ]);

  if (!customer) notFound();

  const c = customer as Customer;
  const siteList = (sites ?? []) as Site[];
  const contactList = (contacts ?? []) as Contact[];
  const quoteList = (quotations ?? []) as VQuotationList[];

  const boundCreateSite = createSite.bind(null, c.id);
  const boundCreateContact = createContact.bind(null, c.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-brand-600">{c.customer_no}</p>
          <h1 className="text-xl font-semibold text-neutral-900">{c.customer_name}</h1>
          {c.company_name && <p className="text-sm text-neutral-500">{c.company_name}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="neutral">{humanize(c.customer_type)}</Badge>
            <Badge tone="neutral">{humanize(c.lead_source)}</Badge>
          </div>
        </div>
        <LinkButton href={`/quotations/new?customer=${c.id}`}>+ New quotation</LinkButton>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Quotations" subtitle={`${quoteList.length} total`} />
            <div className="divide-y divide-black/5">
              {quoteList.length === 0 && (
                <div className="px-5 py-6">
                  <EmptyState title="No quotations for this customer yet" />
                </div>
              )}
              {quoteList.map((q) => (
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
                      {q.project_name} · {formatDate(q.created_at)}
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

          <Card>
            <CardHeader title="Sites" subtitle="Installation locations for this customer" />
            <div className="divide-y divide-black/5">
              {siteList.map((s) => (
                <div key={s.id} className="px-5 py-3 text-sm">
                  <p className="font-medium text-neutral-900">{s.site_name}</p>
                  <p className="text-xs text-neutral-500">
                    {[s.address, s.city, s.province].filter(Boolean).join(", ") || "No address on file"}
                  </p>
                </div>
              ))}
              {siteList.length === 0 && (
                <div className="px-5 py-4 text-sm text-neutral-500">No sites yet.</div>
              )}
            </div>
            <details className="border-t border-black/5 px-5 py-4">
              <summary className="cursor-pointer text-sm font-medium text-brand-700">
                + Add site
              </summary>
              <form action={boundCreateSite} className="mt-4 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Site name">
                    <Input name="site_name" required placeholder="Main rooftop" />
                  </Field>
                  <Field label="Service entrance">
                    <Select name="service_entrance" defaultValue="">
                      <option value="">Unspecified</option>
                      <option value="single_phase">Single phase</option>
                      <option value="three_phase">Three phase</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Address">
                  <Input name="address" />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="City">
                    <Input name="city" />
                  </Field>
                  <Field label="Province">
                    <Input name="province" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Blended retail rate (₱/kWh)">
                    <Input name="blended_retail_rate_php_kwh" type="number" step="0.0001" />
                  </Field>
                  <Field label="Peak sun hours / day">
                    <Input name="peak_sun_hours_per_day" type="number" step="0.01" />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input type="checkbox" name="net_metering_eligible" className="rounded" />
                  Net-metering eligible
                </label>
                <div className="flex justify-end">
                  <Button type="submit" size="sm">Add site</Button>
                </div>
              </form>
            </details>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Contacts" />
            <div className="divide-y divide-black/5">
              {contactList.map((ct) => (
                <div key={ct.id} className="px-5 py-3 text-sm">
                  <p className="font-medium text-neutral-900">
                    {ct.full_name}{" "}
                    {ct.is_primary && <Badge tone="brand" className="ml-1">Primary</Badge>}
                  </p>
                  <p className="text-xs text-neutral-500">{ct.role_title}</p>
                  <p className="text-xs text-neutral-500">
                    {[ct.mobile, ct.email].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))}
              {contactList.length === 0 && (
                <div className="px-5 py-4 text-sm text-neutral-500">No contacts yet.</div>
              )}
            </div>
            <details className="border-t border-black/5 px-5 py-4">
              <summary className="cursor-pointer text-sm font-medium text-brand-700">
                + Add contact
              </summary>
              <form action={boundCreateContact} className="mt-4 space-y-3">
                <Field label="Full name">
                  <Input name="full_name" required />
                </Field>
                <Field label="Role / title">
                  <Input name="role_title" />
                </Field>
                <Field label="Mobile">
                  <Input name="mobile" />
                </Field>
                <Field label="Email">
                  <Input name="email" type="email" />
                </Field>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input type="checkbox" name="is_primary" className="rounded" />
                  Primary contact
                </label>
                <div className="flex justify-end">
                  <Button type="submit" size="sm">Add contact</Button>
                </div>
              </form>
            </details>
          </Card>

          <Card>
            <CardHeader title="Notes" />
            <p className="px-5 py-4 text-sm text-neutral-600">{c.notes || "No notes on file."}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
