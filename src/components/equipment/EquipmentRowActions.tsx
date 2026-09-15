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

export function EquipmentRowActions({
  equipmentId,
  equipmentName,
  deleteAction,
}: {
  equipmentId: string;
  equipmentName: string;
  deleteAction: (formData: FormData) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/equipment/${equipmentId}/edit`}
        className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        title="Edit equipment"
      >
        <IconPencil className="h-4 w-4" />
        <span className="sr-only">Edit {equipmentName}</span>
      </Link>
      <form
        action={deleteAction}
        onSubmit={(e) => {
          if (
            !confirm(
              `Remove ${equipmentName} from the catalog? It won't be offered for new BOM lines or templates, but existing quotations/projects that already reference it are unaffected.`
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Delete equipment"
        >
          <IconTrash className="h-4 w-4" />
          <span className="sr-only">Delete {equipmentName}</span>
        </button>
      </form>
    </div>
  );
}
