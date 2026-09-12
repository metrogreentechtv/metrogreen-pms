import { redirect } from "next/navigation";
import { Sidebar } from "@/components/nav/Sidebar";
import { Topbar } from "@/components/nav/Topbar";
import { getCurrentUser } from "@/lib/current-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const name = user.profile?.full_name || user.email || "User";

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar roles={user.roles} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar name={name} email={user.email} roles={user.roles} />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
