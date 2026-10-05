import { Input } from "./input";

export function ToggleControl({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground">
      <span className="font-semibold">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-primary"
      />
    </label>
  );
}

export function NumberControl({
  label,
  value,
  min,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
      <Input
        type="number"
        min={min}
        value={Number.isFinite(value) ? value : min}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-11 rounded-2xl border border-border bg-secondary px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-foreground outline-none focus:border-primary/50 disabled:opacity-60"
      />
    </label>
  );
}
