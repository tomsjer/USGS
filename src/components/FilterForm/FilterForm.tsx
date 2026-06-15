import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type FilterValues, filterSchema, runQuery, useFiltersStore } from "@/stores";

/**
 * Sidebar filter form. Validates on submit via zodResolver against the filter
 * schema (start ≤ end, magnitude in range, no future dates); only a valid form
 * updates the applied filters. Inline field errors are shown per AGENTS.md.
 *
 * NOTE: stub. On valid submit it records the applied filters in the store; the
 * submit→fetch wiring (and abort-on-resubmit) is a follow-up step that subscribes
 * to `applied`.
 */
export function FilterForm() {
  const ids = useId();
  const applied = useFiltersStore((s) => s.applied);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: applied,
  });

  // Only a valid form reaches here; runQuery records the filters and fetches.
  const onSubmit = handleSubmit((values) => {
    void runQuery(values);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field id={`${ids}-start`} label="Start date" error={errors.starttime?.message}>
        <Input id={`${ids}-start`} type="date" {...register("starttime")} />
      </Field>
      <Field id={`${ids}-end`} label="End date" error={errors.endtime?.message}>
        <Input id={`${ids}-end`} type="date" {...register("endtime")} />
      </Field>
      <Field id={`${ids}-mag`} label="Minimum magnitude" error={errors.minmagnitude?.message}>
        <Input
          id={`${ids}-mag`}
          type="number"
          step="0.1"
          {...register("minmagnitude", { valueAsNumber: true })}
        />
      </Field>
      <Button type="submit">Apply filters</Button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-sm font-medium">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <span role="alert" className="text-xs font-normal text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
