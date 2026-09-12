import { Badge } from "@/components/ui";
import { humanize } from "@/lib/format";
import type { ProjectStatus, QuotationStatus } from "@/lib/types";

const quotationTone: Record<QuotationStatus, keyof typeof toneMap> = {
  draft: "neutral",
  for_review: "amber",
  for_approval: "amber",
  approved: "blue",
  submitted: "purple",
  won: "green",
  lost: "red",
  expired: "red",
  superseded: "neutral",
};

const toneMap = {
  neutral: "neutral",
  amber: "amber",
  blue: "blue",
  purple: "purple",
  green: "green",
  red: "red",
} as const;

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  return <Badge tone={quotationTone[status]}>{humanize(status)}</Badge>;
}

const projectTone: Record<ProjectStatus, keyof typeof toneMap> = {
  awarded: "blue",
  mobilization: "amber",
  in_progress: "amber",
  testing_commissioning: "purple",
  turnover: "green",
  closed: "green",
  on_hold: "neutral",
  cancelled: "red",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={projectTone[status]}>{humanize(status)}</Badge>;
}
