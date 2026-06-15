import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MAX_MAGNITUDE, MIN_MAGNITUDE } from "@/lib/constants";
import { formatMagnitude, roundMagnitude, toUtcDateInput } from "@/lib/utils";
import { type FilterValues, filterSchema, runQuery, useFiltersStore } from "@/stores";
import { DatePickerInput } from "./DatePickerInput";
import { Field } from "./Field";
import { MagnitudeRadiusHint } from "./MagnitudeRadiusHint";

const DATE_PRESETS = [
  { label: "Last month", months: 1 },
  { label: "Last 6 months", months: 6 },
  { label: "Last year", years: 1 },
  { label: "Last 10 years", years: 10 },
] as const;

interface FilterFormProps {
  /** Called after a valid submit fires a query — e.g. to close the mobile drawer. */
  onSubmitted?: () => void;
}

/** Sidebar filter form. Only valid submitted values trigger a USGS query. */
export function FilterForm({ onSubmitted }: FilterFormProps) {
  const ids = useId();
  const applied = useFiltersStore((s) => s.applied);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: applied,
  });

  const [starttime, endtime, minmagnitude, maxmagnitude] = watch([
    "starttime",
    "endtime",
    "minmagnitude",
    "maxmagnitude",
  ]);

  // Only a valid form reaches here; runQuery records the filters and fetches.
  const onSubmit = handleSubmit((values) => {
    void runQuery(values);
    onSubmitted?.();
  });

  const setDateValue = (name: "starttime" | "endtime", value: string) => {
    setValue(name, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const setMagnitudeValue = (name: "minmagnitude" | "maxmagnitude", value: number) => {
    setValue(name, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const applyDatePreset = (preset: (typeof DATE_PRESETS)[number]) => {
    const end = new Date();
    const start = new Date(end);

    if ("months" in preset) {
      start.setUTCMonth(start.getUTCMonth() - preset.months);
    } else {
      start.setUTCFullYear(start.getUTCFullYear() - preset.years);
    }

    setDateValue("starttime", toUtcDateInput(start));
    setDateValue("endtime", toUtcDateInput(end));
  };

  const updateMagnitudeRange = ([min, max]: number[]) => {
    if (min === undefined || max === undefined) return;
    setMagnitudeValue("minmagnitude", roundMagnitude(min));
    setMagnitudeValue("maxmagnitude", roundMagnitude(max));
  };

  const magnitudeError = errors.minmagnitude?.message ?? errors.maxmagnitude?.message;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-2 gap-2">
        {DATE_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="xs"
            onClick={() => applyDatePreset(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <Field id={`${ids}-start`} label="Start date" error={errors.starttime?.message}>
        <DatePickerInput
          id={`${ids}-start`}
          value={starttime}
          invalid={Boolean(errors.starttime)}
          onChange={(value) => setDateValue("starttime", value)}
        />
      </Field>
      <Field id={`${ids}-end`} label="End date" error={errors.endtime?.message}>
        <DatePickerInput
          id={`${ids}-end`}
          value={endtime}
          invalid={Boolean(errors.endtime)}
          onChange={(value) => setDateValue("endtime", value)}
        />
      </Field>
      <Field id={`${ids}-mag`} label="Magnitude range" error={magnitudeError}>
        <div className="flex items-center justify-between gap-3 text-xs font-normal text-muted-foreground">
          <span>
            Min{" "}
            <strong className="font-medium text-foreground">{formatMagnitude(minmagnitude)}</strong>
          </span>
          <span>
            Max{" "}
            <strong className="font-medium text-foreground">{formatMagnitude(maxmagnitude)}</strong>
          </span>
        </div>
        <Slider
          id={`${ids}-mag`}
          value={[minmagnitude, maxmagnitude]}
          min={MIN_MAGNITUDE}
          max={MAX_MAGNITUDE}
          step={0.1}
          minStepsBetweenThumbs={1}
          aria-invalid={Boolean(magnitudeError)}
          onValueChange={updateMagnitudeRange}
        />
        <div className="flex justify-between text-xs font-normal text-muted-foreground">
          <span>{formatMagnitude(MIN_MAGNITUDE)}</span>
          <span>{formatMagnitude(MAX_MAGNITUDE)}</span>
        </div>
        <MagnitudeRadiusHint min={minmagnitude} max={maxmagnitude} />
      </Field>
      <Button type="submit">Apply filters</Button>
    </form>
  );
}
