import { createClient } from "@/lib/supabase/server";
import type { AppRole, UserProfile } from "@/lib/types";

export interface CurrentUser {
  id: string;
  email: string | null;
  profile: UserProfile | null;
  roles: AppRole[];
}

/**
 * Loads the signed-in user's profile and roles for the current request.
 * Call once per Server Component tree (the (app) layout) and pass down;
 * middleware.ts already guarantees a session exists on every route under
 * (app).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  return {
    id: user.id,
    email: user.email ?? null,
    profile: (profile as UserProfile) ?? null,
    roles: (roleRows ?? []).map((r) => r.role as AppRole),
  };
}
