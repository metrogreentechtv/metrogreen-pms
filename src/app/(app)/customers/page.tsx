import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canWrite } from "@/lib/roles";
import { Card, EmptyState, Input, LinkButton } from "@/components/ui";
import { Badge } from "@/components/ui";
import { humanize } from "@/lib/format";
import type { Customer } from "@/lib/types";
import { CustomerRowActions } from "@/components/customers/CustomerRowActions";
import { deleteCustomer } from "./actions";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const writable = user ? canWrite(user.roles) : false;
  const q = searchParams?.q?.trim();

  let query = supabase
    .from("customers")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    query = query.or(
      `customer_name.ilike.%${q}%,company_name.ilike.%${q}%,customer_no.ilike.%${q}%,city.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  const customers = (data ?? []) as Customer[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Customers</h1>
          <p className="text-sm text-neutral-500">
            Every customer, site, and contact MetroGreen has quoted or served.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton
            href={`/customers/export${q ? `?q=${encodeURIComponent(q)}` : ""}`}
            variant="secondary"
            size="sm"
          >
            Export CSV
          </LinkButton>
          {writable && (
            <LinkButton href="/customers/import" variant="secondary" size="sm">
              Import CSV
            </LinkButton>
          )}
          <LinkButton href="/customers/new">+ New customer</LinkButton>
        </div>
      </div>

      <form className="max-w-sm">
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name, company, customer no., city…"
        />
      </form>

      {error && (
        <Card className="px-5 py-4 text-sm text-red-700">
          Could not load customers: {error.message}
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">Customer no.</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Lead source</th>
                {writable && <th className="px-5 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/customers/${c.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {c.customer_no}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-neutral-900">{c.customer_name}</p>
                    {c.company_name && (
                      <p className="text-xs text-neutral-500">{c.company_name}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone="neutral">{humanize(c.customer_type)}</Badge>
                  </td>
                  <td className="px-5 py-3 text-neutral-600">
                    {[c.city, c.province].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-5 py-3 text-neutral-600">
                    {humanize(c.lead_source)}
                  </td>
                  {writable && (
                    <td className="px-5 py-3">
                      <CustomerRowActions
                        customerId={c.id}
                        customerName={c.customer_name}
                        deleteAction={deleteCustomer.bind(null, c.id)}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {customers.length === 0 && !error && (
          <div className="px-5 py-6">
            <EmptyState
              title="No customers found"
              description={q ? "Try a different search." : "Add your first customer to get started."}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
