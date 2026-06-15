import type { ReactNode } from "react";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

export function Field({ id, label, error, children }: FieldProps) {
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
