"use client";

export function DeleteTemplateLineButton({
  description,
  deleteAction,
}: {
  description: string;
  deleteAction: () => void;
}) {
  return (
    <form
      action={deleteAction}
      onSubmit={(e) => {
        if (!confirm(`Remove "${description}" from this template?`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-red-50 hover:text-red-700"
      >
        Remove
      </button>
    </form>
  );
}
