import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AGE_COLORS, MAX_MAGNITUDE, MIN_MAGNITUDE, MS_PER_HOUR } from "@/lib/constants";
import { formatMagnitude, roundMagnitude } from "@/lib/utils";
import { type FilterValues, filterSchema, runQuery, useFiltersStore } from "@/stores";
import { DatePickerInput } from "./DatePickerInput";
import { Field } from "./Field";

/**
 * Date presets mirror the legend's age buckets (`AGE_COLORS`) so the two stay in
 * lockstep — excluding the open-ended "Older" bucket. Dates are day-granularity,
 * so "Past hour" resolves to today.
 */
const DATE_PRESETS = AGE_COLORS.filter((bucket) => Number.isFinite(bucket.maxHours));

/** Section dividers that split the form into "Dates" and "Magnitude range". */
const SECTION_HEADING = "border-b border-border pb-2 text-sm font-medium";

type DatePreset = (typeof DATE_PRESETS)[number];

interface FilterFormProps {
  /** Called after a valid submit fires a query — e.g. to close the mobile drawer. */
  onSubmitted?: () => void;
}

/** Sidebar filter form. Only valid submitted values trigger a USGS query. */
export function FilterForm({ onSubmitted }: FilterFormProps) {
  const ids = useId();
  const applied = useFiltersStore((s) => s.applied);
  const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null);

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

  const setDateValue = (
    name: "starttime" | "endtime",
    value: string,
    options: { preservePreset?: boolean } = {},
  ) => {
    setValue(name, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    if (!options.preservePreset) setActiveDatePreset(null);
  };

  const setMagnitudeValue = (name: "minmagnitude" | "maxmagnitude", value: number) => {
    setValue(name, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const applyDatePreset = (preset: DatePreset) => {
    const end = new Date();
    const start = new Date(end.getTime() - preset.maxHours * MS_PER_HOUR);

    // Presets mean "the last N hours", so query the exact instants. Day-rounding
    // would widen the window past the bucket's `maxHours` (e.g. "Past day" could
    // span ~48h), pulling in older events that then render in the next, cooler
    // color bucket — making the map disagree with the preset and legend.
    setDateValue("starttime", start.toISOString(), { preservePreset: true });
    setDateValue("endtime", end.toISOString(), { preservePreset: true });
    setActiveDatePreset(preset.label);
  };

  const updateMagnitudeRange = ([min, max]: number[]) => {
    if (min === undefined || max === undefined) return;
    setMagnitudeValue("minmagnitude", roundMagnitude(min));
    setMagnitudeValue("maxmagnitude", roundMagnitude(max));
  };

  const magnitudeError = errors.minmagnitude?.message ?? errors.maxmagnitude?.message;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <section className="flex flex-col gap-3">
        <h3 className={SECTION_HEADING}>Dates</h3>
        <Tabs
          defaultValue="presets"
          onValueChange={(value) => {
            // Switching away from the presets tab clears the highlighted preset.
            if (value !== "presets") setActiveDatePreset(null);
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
          <TabsContent value="presets" className="grid min-h-36 grid-cols-2 content-start gap-2">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={activeDatePreset === preset.label}
                data-active={activeDatePreset === preset.label || undefined}
                className="data-[active]:border-primary data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-xs"
                onClick={() => applyDatePreset(preset)}
              >
                <span
                  className="size-3 shrink-0 rounded-full border border-white/60"
                  style={{ backgroundColor: preset.color }}
                  aria-hidden
                />
                {preset.label}
              </Button>
            ))}
          </TabsContent>
          <TabsContent value="custom" className="flex min-h-36 flex-col gap-4">
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
          </TabsContent>
        </Tabs>
      </section>
      <section className="flex flex-col gap-3">
        <h3 className={SECTION_HEADING}>Magnitude range</h3>
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
          aria-label="Magnitude range"
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
        {magnitudeError ? (
          <span role="alert" className="text-xs font-normal text-destructive">
            {magnitudeError}
          </span>
        ) : null}
      </section>
      <Button type="submit">Apply filters</Button>
    </form>
  );
}
