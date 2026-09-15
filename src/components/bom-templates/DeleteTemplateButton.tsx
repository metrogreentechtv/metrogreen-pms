"use client";

export function DeleteTemplateButton({
  name,
  deleteAction,
}: {
  name: string;
  deleteAction: (formData: FormData) => void;
}) {
  return (
    <form
      action={deleteAction}
      onSubmit={(e) => {
        if (
          !confirm(`Delete the "${name}" template? Quotations that already used it keep their BOM lines — this only removes the template itself.`)
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        Delete template
      </button>
    </form>
  );
}
