import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { canWrite } from "@/lib/roles";
import { Badge, Button, Card, CardHeader, LinkButton } from "@/components/ui";
import { CUSTOMER_CSV_HEADERS } from "@/lib/customer-import";
import type { ParseIssue } from "@/lib/customer-import";
import { importCustomersCsv } from "../actions";

export default async function ImportCustomersPage({
  searchParams,
}: {
  searchParams: { created?: string; skipped?: string; issues?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.roles)) {
    redirect("/customers");
  }

  const created = searchParams?.created ? Number(searchParams.created) : null;
  const skipped = searchParams?.skipped ? Number(searchParams.skipped) : null;
  let issues: ParseIssue[] = [];
  if (searchParams?.issues) {
    try {
      issues = JSON.parse(searchParams.issues) as ParseIssue[];
    } catch {
      issues = [];
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Import customers</h1>
          <p className="text-sm text-neutral-500">
            Bring in customers from a spreadsheet. Customer numbers are always assigned
            automatically — any number in the file itself is ignored.
          </p>
        </div>
        <LinkButton href="/customers" variant="secondary">
          Back to customers
        </LinkButton>
      </div>

      {searchParams?.error && (
        <Card className="border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {searchParams.error}
        </Card>
      )}

      {created !== null && (
        <Card className="px-5 py-4">
          <p className="text-sm font-medium text-neutral-900">
            {created} customer{created === 1 ? "" : "s"} imported
            {skipped ? `, ${skipped} skipped` : ""}.
          </p>
          {issues.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-black/5 pt-3 text-xs text-neutral-600">
              <p className="font-medium text-neutral-500">
                Skipped rows{skipped && skipped > issues.length ? ` (first ${issues.length} of ${skipped})` : ""}:
              </p>
              <ul className="list-disc space-y-0.5 pl-4">
                {issues.map((iss, i) => (
                  <li key={i}>
                    Row {iss.row}: {iss.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardHeader title="Upload a CSV file" />
        <form action={importCustomersCsv} className="space-y-4 px-5 py-5">
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
          />
          <Button type="submit" size="sm">
            Import
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Expected columns" subtitle="Matches what Export produces — export once to get a template" />
        <div className="px-5 py-4 text-sm text-neutral-600">
          <div className="flex flex-wrap gap-1.5">
            {CUSTOMER_CSV_HEADERS.map((h) => (
              <Badge key={h} tone="neutral">
                {h}
              </Badge>
            ))}
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-neutral-500">
            <li>Column names are matched case-insensitively; a few common alternates work too.</li>
            <li>&ldquo;Customer Code&rdquo; is ignored — a customer number is always assigned automatically.</li>
            <li>A row needs at least a Contact Person or a Company Name, or it's skipped.</li>
            <li>Customer Type should be one of: residential, commercial, industrial, government, subcontractor_client — anything else defaults to residential.</li>
            <li>If Phone or Email is present, a primary contact is created for that customer.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
