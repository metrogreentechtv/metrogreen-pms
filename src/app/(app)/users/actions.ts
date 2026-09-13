"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/roles";
import type { AppRole } from "@/lib/types";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const roles = (roleRows ?? []).map((r) => r.role as AppRole);

  if (!isAdmin(roles)) {
    throw new Error("Only an administrator can manage users.");
  }
  return supabase;
}

export async function addRole(userId: string, formData: FormData) {
  const supabase = await requireAdmin();
  const role = String(formData.get("role") ?? "");
  if (!role) throw new Error("Select a role to add.");

  const { error } = await supabase.from("user_roles").insert({
    user_id: userId,
    role,
  });
  if (error) throw new Error(`Could not add role: ${error.message}`);

  revalidatePath("/users");
}

export async function removeRole(userId: string, role: AppRole) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (error) throw new Error(`Could not remove role: ${error.message}`);

  revalidatePath("/users");
}

export async function setActive(userId: string, isActive: boolean) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("user_profiles")
    .update({ is_active: isActive })
    .eq("id", userId);
  if (error) throw new Error(`Could not update user: ${error.message}`);

  revalidatePath("/users");
}
