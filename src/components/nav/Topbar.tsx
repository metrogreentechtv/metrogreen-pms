import { roleLabel } from "@/lib/roles";
import type { AppRole } from "@/lib/types";

export function Topbar({
  name,
  email,
  roles,
}: {
  name: string;
  email: string | null;
  roles: AppRole[];
}) {
  return (
    <header className="flex items-center justify-between border-b border-black/5 bg-white px-6 py-3 print:hidden">
      <div className="md:hidden text-sm font-semibold text-brand-800">MetroGreen</div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium leading-tight text-neutral-900">{name}</p>
          <p className="text-[11px] leading-tight text-neutral-500">
            {roles.length ? roles.map(roleLabel).join(" · ") : email}
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
          {name.slice(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
