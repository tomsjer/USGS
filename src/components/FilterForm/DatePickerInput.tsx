import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fromDateInput, toUtcDateInput } from "@/lib/utils";

interface DatePickerInputProps {
  id: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}

export function DatePickerInput({ id, value, invalid, onChange }: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const selected = fromDateInput(value);

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="\\d{4}-\\d{2}-\\d{2}"
        placeholder="YYYY-MM-DD"
        value={value}
        aria-invalid={invalid}
        onChange={(event) => onChange(event.target.value)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Open calendar"
            className="shrink-0"
          >
            <CalendarIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            timeZone="UTC"
            selected={selected}
            disabled={{ after: new Date() }}
            captionLayout="dropdown"
            onSelect={(date) => {
              if (!date) return;
              onChange(toUtcDateInput(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
