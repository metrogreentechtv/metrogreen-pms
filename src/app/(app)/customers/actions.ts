"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canWrite } from "@/lib/roles";
import { parseCsvToRecords } from "@/lib/csv";
import { parseCustomerRecord, type ParseIssue } from "@/lib/customer-import";
import type { CustomerType, LeadSource, ServiceEntrance } from "@/lib/types";

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: customerNo, error: numError } = await supabase.rpc("next_number", {
    p_code: "customer",
  });
  if (numError) {
    throw new Error(`Could not allocate a customer number: ${numError.message}`);
  }

  const payload = {
    customer_no: customerNo as string,
    customer_name: String(formData.get("customer_name") ?? "").trim(),
    company_name: String(formData.get("company_name") ?? "").trim() || null,
    customer_type: String(formData.get("customer_type")) as CustomerType,
    industry: String(formData.get("industry") ?? "").trim() || null,
    billing_address: String(formData.get("billing_address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    province: String(formData.get("province") ?? "").trim() || null,
    lead_source: String(formData.get("lead_source")) as LeadSource,
    lead_source_detail: String(formData.get("lead_source_detail") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user.id,
  };

  const { data: customer, error } = await supabase
    .from("customers")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not create customer: ${error.message}`);
  }

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function createSite(customerId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: siteNo, error: numError } = await supabase.rpc("next_number", {
    p_code: "site",
  });
  if (numError) {
    throw new Error(`Could not allocate a site number: ${numError.message}`);
  }

  const payload = {
    site_no: siteNo as string,
    customer_id: customerId,
    site_name: String(formData.get("site_name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    province: String(formData.get("province") ?? "").trim() || null,
    service_entrance: (String(formData.get("service_entrance") ?? "") ||
      null) as ServiceEntrance | null,
    distribution_utility: String(formData.get("distribution_utility") ?? "").trim() || null,
    blended_retail_rate_php_kwh: formData.get("blended_retail_rate_php_kwh")
      ? Number(formData.get("blended_retail_rate_php_kwh"))
      : null,
    net_metering_eligible: formData.get("net_metering_eligible") === "on",
    peak_sun_hours_per_day: formData.get("peak_sun_hours_per_day")
      ? Number(formData.get("peak_sun_hours_per_day"))
      : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user.id,
  };

  const { error } = await supabase.from("sites").insert(payload);
  if (error) {
    throw new Error(`Could not create site: ${error.message}`);
  }

  revalidatePath(`/customers/${customerId}`);
}

export async function createContact(customerId: string, formData: FormData) {
  const supabase = await createClient();

  const payload = {
    customer_id: customerId,
    full_name: String(formData.get("full_name") ?? "").trim(),
    role_title: String(formData.get("role_title") ?? "").trim() || null,
    mobile: String(formData.get("mobile") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    is_primary: formData.get("is_primary") === "on",
  };

  const { error } = await supabase.from("contacts").insert(payload);
  if (error) {
    throw new Error(`Could not add contact: ${error.message}`);
  }

  revalidatePath(`/customers/${customerId}`);
}

export async function importCustomersCsv(formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canWrite(user.roles)) {
    throw new Error("Your role can't import customers.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/customers/import?error=" + encodeURIComponent("Choose a CSV file first."));
  }

  const text = await (file as File).text();
  const records = parseCsvToRecords(text);

  if (records.length === 0) {
    redirect(
      "/customers/import?error=" +
        encodeURIComponent("That file has no data rows (or the header row couldn't be read).")
    );
  }

  let created = 0;
  const issues: ParseIssue[] = [];

  // Sequential on purpose: next_number() row-locks a shared counter, so
  // parallel inserts would just contend on the same lock anyway, and this
  // keeps per-row error handling simple for what's normally a few dozen to
  // a few hundred rows.
  for (let i = 0; i < records.length; i++) {
    const rowNumber = i + 2; // header is row 1
    const { row, issue } = parseCustomerRecord(records[i], rowNumber);
    if (issue) {
      issues.push(issue);
      continue;
    }
    if (!row) continue;

    const { data: customerNo, error: numError } = await supabase.rpc("next_number", {
      p_code: "customer",
    });
    if (numError) {
      issues.push({ row: rowNumber, reason: `Could not allocate a customer number: ${numError.message}` });
      continue;
    }

    const { data: customer, error: insertError } = await supabase
      .from("customers")
      .insert({
        customer_no: customerNo as string,
        customer_name: row.customerName,
        company_name: row.companyName,
        customer_type: row.customerType,
        industry: row.industry,
        billing_address: row.billingAddress,
        city: row.city,
        province: row.province,
        notes: row.notes,
        lead_source: row.leadSource as LeadSource,
        lead_source_detail: row.leadSourceDetail,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !customer) {
      issues.push({ row: rowNumber, reason: `Could not create customer: ${insertError?.message ?? "unknown error"}` });
      continue;
    }

    created++;

    if (row.mobile || row.email) {
      const { error: contactError } = await supabase.from("contacts").insert({
        customer_id: customer.id,
        full_name: row.contactFullName || row.customerName,
        mobile: row.mobile,
        email: row.email,
        is_primary: true,
      });
      if (contactError) {
        issues.push({ row: rowNumber, reason: `Customer created, but contact info couldn't be saved: ${contactError.message}` });
      }
    }
  }

  revalidatePath("/customers");

  const params = new URLSearchParams();
  params.set("created", String(created));
  params.set("skipped", String(issues.length));
  if (issues.length > 0) {
    params.set("issues", JSON.stringify(issues.slice(0, 25)));
  }
  redirect(`/customers/import?${params.toString()}`);
}
