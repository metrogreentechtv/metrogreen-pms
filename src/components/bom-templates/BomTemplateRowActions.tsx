"use client";

import Link from "next/link";

function IconPencil({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 7h16" />
      <path d="M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
      <path d="M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

// Same pencil/bin row-action convention used on the Customers list, the
// Equipment catalog, and a customer's Sites card — edit links straight to
// the template's own detail page (that page already *is* the edit form,
// unlike customers/equipment/sites which have a separate /edit route), and
// delete is a bound server action with a confirm() dialog, wired to the
// same deleteTemplate() the template detail page's own "Delete template"
// button already uses (a hard delete — safe here since applying a
// template copies its lines onto a quotation's own BOM rather than
// keeping a live reference back to the template).
export function BomTemplateRowActions({
  templateId,
  templateName,
  deleteAction,
}: {
  templateId: string;
  templateName: string;
  deleteAction: (formData: FormData) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/bom-templates/${templateId}`}
        className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        title="Edit template"
      >
        <IconPencil className="h-4 w-4" />
        <span className="sr-only">Edit {templateName}</span>
      </Link>
      <form
        action={deleteAction}
        onSubmit={(e) => {
          if (
            !confirm(
              `Delete the "${templateName}" template? Quotations that already used it keep their BOM lines — this only removes the template itself.`
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Delete template"
        >
          <IconTrash className="h-4 w-4" />
          <span className="sr-only">Delete {templateName}</span>
        </button>
      </form>
    </div>
  );
}
