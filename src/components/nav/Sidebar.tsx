"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@/lib/types";
import { cx } from "@/components/ui";
import { signOut } from "@/app/login/actions";
import {
  IconAuditLog,
  IconCustomers,
  IconDashboard,
  IconEquipment,
  IconProjectManagement,
  IconProjects,
  IconQuotations,
  IconSettings,
  IconSignOut,
  IconUsers,
} from "@/components/nav/icons";

type IconComponent = (props: { className?: string }) => JSX.Element;

interface NavItem {
  href: string;
  label: string;
  icon: IconComponent;
  roles: AppRole[] | null;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard", icon: IconDashboard, roles: null }],
  },
  {
    label: "Sales",
    items: [
      { href: "/customers", label: "Customers", icon: IconCustomers, roles: null },
      { href: "/quotations", label: "Quotations", icon: IconQuotations, roles: null },
    ],
  },
  {
    label: "Projects",
    items: [
      { href: "/projects", label: "Projects", icon: IconProjects, roles: null },
      { href: "/projects/management", label: "Project Management", icon: IconProjectManagement, roles: null },
    ],
  },
  {
    label: "Inventory",
    items: [{ href: "/equipment", label: "Equipment", icon: IconEquipment, roles: null }],
  },
  {
    label: "Admin",
    items: [
      {
        href: "/users",
        label: "Users",
        icon: IconUsers,
        roles: ["administrator"] as AppRole[],
      },
      {
        href: "/settings",
        label: "Settings",
        icon: IconSettings,
        roles: ["administrator", "management"] as AppRole[],
      },
      {
        href: "/audit-log",
        label: "Audit Log",
        icon: IconAuditLog,
        roles: ["administrator", "management"] as AppRole[],
      },
    ],
  },
];

const ALL_HREFS = NAV.flatMap((g) => g.items.map((i) => i.href));

// A nav item is "active" if the current path matches it, but not if some
// other nav item's href is a longer (more specific) match for the same
// path — e.g. on /projects/management, only "Project Management" lights
// up, not the sibling "Projects" link, even though both are path prefixes.
function isActiveHref(pathname: string, href: string): boolean {
  const matches = (h: string) => pathname === h || pathname.startsWith(h + "/");
  if (!matches(href)) return false;
  return !ALL_HREFS.some((other) => other !== href && other.length > href.length && matches(other));
}

export function Sidebar({ roles }: { roles: AppRole[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-navy-700 text-navy-100 md:flex print:hidden">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-white">
          <Image src="/logo.png" alt="METROGREEN" fill sizes="40px" className="object-contain p-1" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-white">Metrogreen </p>
          <p className="text-[10px] leading-tight text-white">Process Management System</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {NAV.map((group) => {
          const items = group.items.filter(
            (item) => !item.roles || item.roles.some((r) => roles.includes(r))
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label ?? "_top"}>
              {group.label && (
                <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-navy-300">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = isActiveHref(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cx(
  "flex items-center gap-3 rounded-md py-2 pl-3 pr-3 text-sm transition-colors",
  active
    ? "bg-[#159a1a] text-white"
    : "text-navy-100 hover:bg-white/5 hover:text-white"
)}
                    >
                      <Icon className="h-[22px] w-[22px] shrink-0 text-white" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="space-y-3 px-4 py-4">
        <p className="text-[10px] leading-tight text-navy-white">Meycauayan, Bulacan · Philippines</p>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-navy-100 transition-colors hover:bg-white/5 hover:text-white"
          >
            <IconSignOut className="h-[22px] w-[22px] text-white" /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
