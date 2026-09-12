import { Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import type { QuotationStatus } from "@/lib/types";

const NEXT_STATUSES: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ["for_review", "for_approval"],
  for_review: ["draft", "for_approval"],
  for_approval: ["draft", "approved"],
  approved: ["submitted", "expired"],
  submitted: ["won", "lost", "expired"],
  won: [],
  lost: [],
  expired: [],
  superseded: [],
};

const STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: "Back to draft",
  for_review: "Send for review",
  for_approval: "Submit for approval",
  approved: "Approve",
  submitted: "Mark as submitted to customer",
  won: "Mark won",
  lost: "Mark lost",
  expired: "Mark expired",
  superseded: "Supersede",
};

export function StatusActions({
  status,
  isCurrentRevision,
  canApprove,
  canWrite,
  marginCompliant,
  marginOverridden,
  changeStatusAction,
  overrideMarginAction,
  createRevisionAction,
  createProjectAction,
  projectExists,
}: {
  status: QuotationStatus;
  isCurrentRevision: boolean;
  canApprove: boolean;
  canWrite: boolean;
  marginCompliant: boolean | null;
  marginOverridden: boolean;
  changeStatusAction: (toStatus: string, formData: FormData) => Promise<void>;
  overrideMarginAction: (formData: FormData) => Promise<void>;
  createRevisionAction: (formData: FormData) => Promise<void>;
  createProjectAction?: (formData: FormData) => Promise<void>;
  projectExists?: boolean;
}) {
  if (!isCurrentRevision) {
    return (
      <Card className="px-5 py-4 text-sm text-neutral-500">
        You are viewing a superseded revision — it is read-only. Open the current revision to take
        action.
      </Card>
    );
  }

  const nextStatuses = NEXT_STATUSES[status] ?? [];
  const showMarginBlock = status === "for_approval" && marginCompliant === false && !marginOverridden;

  return (
    <Card>
      <CardHeader title="Status" subtitle="Only the moves valid from this status are shown" />
      <div className="space-y-4 px-5 py-5">
        {showMarginBlock && canApprove && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              This revision is below the minimum gross margin. Management or an administrator can
              record an override reason to allow approval anyway.
            </p>
            <form action={overrideMarginAction} className="mt-2 space-y-2">
              <Textarea name="reason" rows={2} required placeholder="Reason for overriding the minimum margin…" />
              <Button type="submit" size="sm" variant="secondary">
                Record override
              </Button>
            </form>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((next) => {
            if (next === "approved" && !canApprove) return null;
            if (!canWrite) return null;
            if (next === "lost") {
              return (
                <details key={next} className="w-full">
                  <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                    {STATUS_LABEL[next]}
                  </summary>
                  <form action={changeStatusAction.bind(null, next)} className="mt-2 space-y-2">
                    <Field label="Reason (required)">
                      <Textarea name="note" rows={2} required />
                    </Field>
                    <Button type="submit" size="sm" variant="danger">
                      Confirm lost
                    </Button>
                  </form>
                </details>
              );
            }
            return (
              <form key={next} action={changeStatusAction.bind(null, next)}>
                <Button type="submit" variant={next === "approved" ? "primary" : "secondary"}>
                  {STATUS_LABEL[next]}
                </Button>
              </form>
            );
          })}
        </div>

        {canWrite && (
          <details className="border-t border-black/5 pt-4">
            <summary className="cursor-pointer text-sm font-medium text-brand-700">
              + Create next revision
            </summary>
            <form action={createRevisionAction} className="mt-3 space-y-3">
              <Field label="Reason for revision" hint="Required from Rev 01 onward.">
                <Input name="reason" required placeholder="e.g. Changed inverter per client request" />
              </Field>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" name="reprice" className="rounded" />
                Re-price using current equipment costs
              </label>
              <Button type="submit" size="sm">
                Create revision
              </Button>
            </form>
          </details>
        )}

        {status === "won" && createProjectAction && !projectExists && canWrite && (
          <details className="border-t border-black/5 pt-4" open>
            <summary className="cursor-pointer text-sm font-medium text-brand-700">
              Award to project
            </summary>
            <form action={createProjectAction} className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Target start date">
                  <Input name="target_start_date" type="date" />
                </Field>
                <Field label="Target completion date">
                  <Input name="target_completion_date" type="date" />
                </Field>
              </div>
              <Button type="submit" size="sm">
                Create project
              </Button>
            </form>
          </details>
        )}
      </div>
    </Card>
  );
}
