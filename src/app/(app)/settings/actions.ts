"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateSetting(key: string, dataType: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const raw = String(formData.get("value") ?? "");
  let value: unknown = raw;

  if (dataType === "number") {
    value = Number(raw);
  } else if (dataType === "boolean") {
    value = raw === "true";
  } else if (dataType === "array") {
    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error("Value must be valid JSON for an array setting, e.g. [0.1,0.2,...]");
    }
  }

  const { error } = await supabase
    .from("settings")
    .update({ value, updated_by: user.id })
    .eq("key", key);

  if (error) throw new Error(`Could not update setting: ${error.message}`);

  revalidatePath("/settings");
}
