"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@/lib/types";
import { cx } from "@/components/ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", roles: null },
  { href: "/quotations", label: "Quotations", icon: "📄", roles: null },
  { href: "/customers", label: "Customers", icon: "🏢", roles: null },
  { href: "/equipment", label: "Equipment", icon: "🔧", roles: null },
  { href: "/projects", label: "Projects", icon: "🏗️", roles: null },
  {
    href: "/settings",
    label: "Settings",
    icon: "⚙️",
    roles: ["administrator", "management"] as AppRole[],
  },
] as const;

export function Sidebar({ roles }: { roles: AppRole[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-black/5 bg-brand-950 text-brand-50 md:flex print:hidden">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
          MG
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">MetroGreen</p>
          <p className="text-[10px] leading-tight text-brand-300">
            Process &amp; Management
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV.filter(
          (item) => !item.roles || item.roles.some((r) => roles.includes(r))
        ).map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand-600 text-white"
                  : "text-brand-200 hover:bg-brand-900 hover:text-white"
              )}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 text-[10px] text-brand-400">
        Meycauayan, Bulacan · Philippines
      </div>
    </aside>
  );
}
