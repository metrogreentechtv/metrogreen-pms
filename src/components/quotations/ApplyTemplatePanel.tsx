"use client";

import { useMemo, useState } from "react";
import { Button, Field, Select } from "@/components/ui";
import { formatNumber, formatPhp } from "@/lib/format";
import type { BomTemplate, BomTemplateLine, EquipmentCurrentPriceView } from "@/lib/types";

type TemplateWithLines = BomTemplate & { bom_template_lines: BomTemplateLine[] };

export function ApplyTemplatePanel({
  templates,
  equipment,
  action,
}: {
  templates: TemplateWithLines[];
  equipment: EquipmentCurrentPriceView[];
  action: (formData: FormData) => void;
}) {
  const [templateId, setTemplateId] = useState("");
  const template = templates.find((t) => t.id === templateId);

  const majorLines = useMemo(
    () => (template?.bom_template_lines ?? []).filter((l) => l.is_major).sort((a, b) => a.line_no - b.line_no),
    [template]
  );
  const fixedLines = useMemo(
    () => (template?.bom_template_lines ?? []).filter((l) => !l.is_major).sort((a, b) => a.line_no - b.line_no),
    [template]
  );
  const fixedLinesTotal = fixedLines.reduce((sum, l) => sum + l.quantity * l.unit_price_php, 0);

  const byCategory = useMemo(() => {
    const map: Record<string, EquipmentCurrentPriceView[]> = {};
    for (const e of equipment) (map[e.category_id] ??= []).push(e);
    return map;
  }, [equipment]);

  if (templates.length === 0) {
    return (
      <p className="text-xs text-neutral-500">
        No standard BOM templates yet — an administrator or engineer can create one under BOM Templates.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Standard BOM template">
        <Select
          name="template_id"
          required
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        >
          <option value="" disabled>
            Select a package…
          </option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({formatNumber(t.system_size_kwp, 1)} kWp
              {t.system_type ? `, ${t.system_type.replace(/_/g, " ")}` : ""})
            </option>
          ))}
        </Select>
      </Field>

      {template && (
        <>
          {majorLines.length > 0 && (
            <div className="space-y-3 rounded-lg border border-black/5 bg-neutral-50 p-3">
              <p className="text-xs font-medium text-neutral-600">
                Choose the major equipment for this quotation
              </p>
              {majorLines.map((line) => (
                <Field key={line.id} label={line.description}>
                  <Select name={`major_${line.id}`} required defaultValue="">
                    <option value="" disabled>
                      Select…
                    </option>
                    {(byCategory[line.category_id] ?? []).map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.description} {e.manufacturer ? `— ${e.manufacturer}` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
          )}

          {fixedLines.length > 0 && (
            <div className="rounded-lg border border-black/5 p-3">
              <p className="text-xs font-medium text-neutral-600">
                Plus {fixedLines.length} standard line item{fixedLines.length === 1 ? "" : "s"} from the
                template
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-neutral-500">
                {fixedLines.map((line) => (
                  <li key={line.id} className="flex justify-between gap-2">
                    <span>
                      {formatNumber(line.quantity)} {line.unit} — {line.description}
                    </span>
                    <span className="tabular-nums">{formatPhp(line.quantity * line.unit_price_php)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between border-t border-black/5 pt-1.5 text-xs font-medium text-neutral-700">
                <span>Fixed items subtotal</span>
                <span className="tabular-nums">{formatPhp(fixedLinesTotal)}</span>
              </p>
            </div>
          )}

          <p className="text-xs text-neutral-400">
            Lines are added at current catalog prices where a catalog item is on file, or at the
            template&apos;s reference price otherwise. You can still add extra items or special inclusions
            below afterward.
          </p>

          <div className="flex justify-end">
            <Button type="submit" size="sm">
              Apply template
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
