"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

type KandySettingsPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
};

export function KandySettingsPanel({ title, description, icon: Icon, children, className }: KandySettingsPanelProps) {
  return (
    <Card className={cn("gap-0 overflow-hidden py-0 shadow-none", className)}>
      <header className="flex flex-wrap items-start gap-3 border-b border-border p-4">
        <Icon className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1 basis-40 break-words">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </header>
      {children}
    </Card>
  );
}

export function KandyReadOnlyNotice({ children }: { children: ReactNode }) {
  return <p className="border-b border-border bg-muted px-4 py-3 text-sm break-words text-foreground">{children}</p>;
}

type KandySettingsFieldProps = {
  label: string;
  description?: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date";
  disabled?: boolean;
};

export function KandySettingsField({ label, description, icon: Icon, value, onChange, placeholder, type = "text", disabled = false }: KandySettingsFieldProps) {
  return (
    <label className="block border-b border-border px-4 py-4 last:border-b-0">
      <span className="flex flex-wrap items-start gap-3">
        <Icon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 basis-40 break-words">
          <span className="block text-sm font-medium text-foreground">{label}</span>
          {description ? <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span> : null}
        </span>
      </span>
      <input
            type={type}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="mt-3 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

type KandySettingsSelectProps = {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
};

export function KandySettingsSelect({ label, icon: Icon, value, onChange, options, disabled = false }: KandySettingsSelectProps) {
  return (
    <label className="block border-b border-border px-4 py-4 last:border-b-0">
      <span className="flex flex-wrap items-start gap-3">
      <Icon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 basis-40 break-words">
        <span className="block text-sm font-medium text-foreground">{label}</span>
      </span>
      </span>
        <NativeSelect className="mt-3" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
          {options.map((option) => <NativeSelectOption key={option} value={option}>{option}</NativeSelectOption>)}
        </NativeSelect>
    </label>
  );
}

type KandyToggleRowProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  badge?: string;
};

export function KandyToggleRow({ label, description, checked, onChange, disabled = false, badge }: KandyToggleRowProps) {
  return (
    <div className="flex min-h-16 flex-wrap items-center gap-3 border-b border-border px-4 py-4 last:border-b-0">
      <div className="min-w-0 flex-1 basis-40 break-words">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 max-w-full break-words text-sm font-medium text-foreground">{label}</p>
          {badge ? <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{badge}</span> : null}
        </div>
        {description ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
      <span className="text-xs text-muted-foreground" aria-hidden="true">{checked ? "On" : "Off"}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${checked ? "on" : "off"}`}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn("flex h-11 w-12 shrink-0 items-center rounded-full border p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", checked ? "justify-end border-primary bg-primary" : "justify-start border-border bg-muted")}
      >
        <span className="h-9 w-9 rounded-full border border-border bg-background" />
      </button>
      </div>
    </div>
  );
}

type KandyInfoRowProps = {
  label: string;
  description?: string;
  value?: string;
  icon: LucideIcon;
  badge?: string;
};

export function KandyInfoRow({ label, description, value, icon: Icon, badge }: KandyInfoRowProps) {
  return (
    <div className="flex min-h-16 flex-wrap items-center gap-3 border-b border-border px-4 py-4 last:border-b-0">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 basis-40 break-words">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span> : null}
      </span>
      {value ? <span className="min-w-0 max-w-full flex-1 basis-40 break-words text-sm text-muted-foreground">{value}</span> : null}
      {badge ? <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{badge}</span> : null}
    </div>
  );
}

type KandyActionRowProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick"> & {
  label: string;
  description?: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export const KandyActionRow = forwardRef<HTMLButtonElement, KandyActionRowProps>(function KandyActionRow({ label, description, icon: Icon, href, onClick, destructive = false, disabled = false, className: suppliedClassName, ...buttonProps }, ref) {
  const content = (
    <>
      <Icon className={cn("h-4 w-4 shrink-0", destructive ? "text-destructive" : "text-muted-foreground")} aria-hidden="true" />
      <span className="min-w-0 flex-1 text-left [overflow-wrap:anywhere]">
        <span className={cn("block text-sm font-medium", destructive ? "text-destructive" : "text-foreground")}>{label}</span>
        {description ? <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span> : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </>
  );
  const className = cn("flex min-h-16 w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", destructive ? "hover:bg-destructive/10" : "hover:bg-muted", suppliedClassName);

  if (href) return <Link href={href} onClick={onClick} className={className}>{content}</Link>;
  return <button {...buttonProps} ref={ref} type="button" onClick={onClick} disabled={disabled} className={className}>{content}</button>;
});
