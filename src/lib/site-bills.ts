import type { createClient } from "@/lib/supabase/server";
import type { SiteBillUpload } from "@/lib/types";
import type { SiteBillUploadWithUrl } from "@/components/customers/SiteBillList";

// One hour is generous for a single page load/print session and short
// enough that a copied link goes stale quickly — the bucket is private
// (migration site_bill_uploads_and_storage_bucket), so every "View" link
// has to be signed fresh like this rather than a stored public URL.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Fetches a site's uploaded electric-bill rows and signs a short-lived
 * Storage URL for each, newest/most-relevant first. Shared by the
 * customer's Site edit page (where bills are uploaded/deleted) and a
 * quotation's Load & Sizing tab (where they're just referenced while
 * typing in the actual kWh/₱ figures) so both list the exact same data
 * the same way. */
export async function fetchSiteBillsWithUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siteId: string
): Promise<SiteBillUploadWithUrl[]> {
  const { data: rows } = await supabase
    .from("site_bill_uploads")
    .select("*")
    .eq("site_id", siteId)
    .order("period_year", { ascending: false, nullsFirst: false })
    .order("period_month", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const bills = (rows ?? []) as SiteBillUpload[];
  if (bills.length === 0) return [];

  return Promise.all(
    bills.map(async (b) => {
      const { data } = await supabase.storage
        .from("site-bills")
        .createSignedUrl(b.storage_path, SIGNED_URL_TTL_SECONDS);
      return { ...b, signed_url: data?.signedUrl ?? null };
    })
  );
}
