import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { isAdmin, canApprove } from "@/lib/roles";
import { redirect } from "next/navigation";
import { Badge, Button, Card, CardHeader, Input } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Setting } from "@/lib/types";
import { updateSetting } from "./actions";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user || !canApprove(user.roles)) {
    redirect("/dashboard");
  }
  const canEdit = isAdmin(user.roles) || canApprove(user.roles);

  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").order("category").order("key");
  const settings = (data ?? []) as Setting[];

  const grouped = settings.reduce<Record<string, Setting[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Business settings</h1>
        <p className="text-sm text-neutral-500">
          These values drive the calculation engine across every quotation — VAT, minimum margin,
          default assumptions, and document boilerplate. Changes apply to revisions created or
          recalculated afterward, not retroactively.
        </p>
      </div>

      {Object.entries(grouped).map(([category, rows]) => (
        <Card key={category}>
          <CardHeader title={category[0].toUpperCase() + category.slice(1)} />
          <div className="divide-y divide-black/5">
            {rows.map((s) => (
              <div key={s.key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-[220px]">
                  <p className="text-sm font-medium text-neutral-900">{s.label}</p>
                  <p className="text-xs text-neutral-400">{s.key}</p>
                  {s.requires_confirmation && (
                    <Badge tone="amber" className="mt-1">
                      Working default — please confirm
                    </Badge>
                  )}
                </div>
                {canEdit ? (
                  <form action={updateSetting.bind(null, s.key, s.data_type)} className="flex items-center gap-2">
                    <Input
                      name="value"
                      defaultValue={
                        typeof s.value === "object" ? JSON.stringify(s.value) : String(s.value)
                      }
                      className="w-64"
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      Save
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm text-neutral-700">
                    {typeof s.value === "object" ? JSON.stringify(s.value) : String(s.value)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}

      <p className="text-xs text-neutral-400">
        Last updated: {settings[0] ? formatDate(settings[0].updated_at) : "—"}
      </p>
    </div>
  );
}
