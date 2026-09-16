"use client";

import { useMemo, useState } from "react";
import { Button, EmptyState, Field, Input, Select, Textarea } from "@/components/ui";
import { formatPhp } from "@/lib/format";
import type { AncillaryService } from "@/lib/types";

const PRICING_METHOD_LABEL: Record<AncillaryService["pricing_method"], string> = {
  per_sqm: "per square meter",
  per_linear_meter: "per linear meter",
  per_unit: "per unit",
  flat: "flat (one lot)",
};

export function AddAncillaryServiceForm({
  services,
  action,
}: {
  services: AncillaryService[];
  action: (formData: FormData) => void;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");

  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const isFlat = service?.pricing_method === "flat";
  const previewTotal = service ? (isFlat ? 1 : Number(quantity) || 0) * service.rate_php : 0;

  if (services.length === 0) {
    return (
      <EmptyState
        title="No ancillary services set up yet"
        description='Add Mobilization/Demobilization, trenching, canopy fabrication, and other services under "Ancillary Services" (Admin) first.'
      />
    );
  }

  return (
    <form action={action} className="space-y-3">
      <Field label="Service">
        <Select name="service_id" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {formatPhp(s.rate_php)} {PRICING_METHOD_LABEL[s.pricing_method]}
              {s.rate_php === 0 ? " (rate not yet set)" : ""}
            </option>
          ))}
        </Select>
      </Field>

      {!isFlat && (
        <Field label={`Quantity (${service?.unit_label ?? "unit"})`}>
          <Input
            name="quantity"
            type="number"
            step="0.01"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
      )}

      <Field label="Notes">
        <Textarea name="notes" rows={2} />
      </Field>

      <p className="text-xs text-neutral-500">
        Adds to the BOQ at {service ? formatPhp(service.rate_php) : "—"}{" "}
        {service ? PRICING_METHOD_LABEL[service.pricing_method] : ""} — line total {formatPhp(previewTotal)}.
        Category and proposal grouping come from the service&apos;s settings; adjust the price or grouping
        afterward like any other BOM line.
      </p>

      <div className="flex justify-end">
        <Button type="submit" size="sm">
          Add service
        </Button>
      </div>
    </form>
  );
}
