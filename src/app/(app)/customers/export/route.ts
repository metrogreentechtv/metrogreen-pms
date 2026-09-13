import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rowsToCsv } from "@/lib/csv";
import { CUSTOMER_CSV_HEADERS } from "@/lib/customer-import";
import type { Contact, Customer } from "@/lib/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();

  let query = supabase
    .from("customers")
    .select("*")
    .eq("is_active", true)
    .order("customer_no");

  if (q) {
    query = query.or(
      `customer_name.ilike.%${q}%,company_name.ilike.%${q}%,customer_no.ilike.%${q}%,city.ilike.%${q}%`
    );
  }

  const { data: customerRows, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const customers = (customerRows ?? []) as Customer[];
  const customerIds = customers.map((c) => c.id);

  const contactByCustomer = new Map<string, Contact>();
  if (customerIds.length > 0) {
    const { data: contactRows } = await supabase
      .from("contacts")
      .select("*")
      .in("customer_id", customerIds)
      .order("is_primary", { ascending: false });
    for (const c of (contactRows ?? []) as Contact[]) {
      if (!contactByCustomer.has(c.customer_id)) {
        contactByCustomer.set(c.customer_id, c);
      }
    }
  }

  const rows = customers.map((c) => {
    const contact = contactByCustomer.get(c.id);
    return [
      c.customer_no,
      c.company_name ?? "",
      c.customer_name,
      contact?.email ?? "",
      contact?.mobile ?? "",
      c.billing_address ?? "",
      c.city ?? "",
      c.province ?? "",
      c.industry ?? "",
      c.customer_type,
      c.notes ?? "",
    ];
  });

  const csv = rowsToCsv([...CUSTOMER_CSV_HEADERS], rows);
  const filename = `metrogreen-customers-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
