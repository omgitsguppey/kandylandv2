"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { Card } from "@/components/creative-tim/ui/card";
import { cn } from "@/lib/utils";

type KandySettingsPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
};

export function KandySettingsPanel({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
  className,
}: KandySettingsPanelProps) {
  return (
    <Card className={cn("!gap-0 !overflow-hidden !rounded-[1.7rem] !border-white/10 !bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025)_45%,rgba(178,140,255,0.07))] !p-0 shadow-[0_18px_45px_rgba(0,0,0,0.2)]", className)}>
      <header className="flex items-start gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/15 text-brand-purple shadow-[0_0_18px_rgba(178,140,255,0.12)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-pink">{eyebrow}</p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-white">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-white/55">{description}</p>
        </div>
      </header>
      {children}
    </Card>
  );
}

export function KandyReadOnlyNotice({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-brand-purple/20 bg-brand-purple/10 px-4 py-3 text-sm font-semibold text-purple-100 sm:px-5">
      {children}
    </div>
  );
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

export function KandySettingsField({
  label,
  description,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: KandySettingsFieldProps) {
  return (
    <label className="block border-b border-white/8 px-4 py-4 last:border-b-0 sm:px-5">
      <span className="flex items-start gap-3">
        <span className="mt-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-white/55">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-white">{label}</span>
          {description ? <span className="mt-1 block text-xs leading-5 text-white/50">{description}</span> : null}
          <input
            type={type}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="mt-3 min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-brand-purple/55 focus:ring-2 focus:ring-brand-purple/20 disabled:cursor-not-allowed disabled:opacity-55"
          />
        </span>
      </span>
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

export function KandySettingsSelect({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  disabled = false,
}: KandySettingsSelectProps) {
  return (
    <label className="flex items-center gap-3 border-b border-white/8 px-4 py-4 last:border-b-0 sm:px-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-white/55">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white">{label}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="mt-3 min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm font-semibold text-white outline-none transition focus:border-brand-purple/55 focus:ring-2 focus:ring-brand-purple/20 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {options.map((option) => (
            <option key={option} value={option} className="bg-[#17101f] text-white">
              {option}
            </option>
          ))}
        </select>
      </span>
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

export function KandyToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  badge,
}: KandyToggleRowProps) {
  return (
    <div className="flex min-h-16 items-center gap-4 border-b border-white/8 px-4 py-4 last:border-b-0 sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-white">{label}</p>
          {badge ? <span className="rounded-full border border-brand-purple/25 bg-brand-purple/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-purple-100">{badge}</span> : null}
        </div>
        {description ? <p className="mt-1 text-xs leading-5 text-white/50">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${checked ? "on" : "off"}`}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn(
          "flex h-11 w-12 shrink-0 items-center rounded-full border p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0915] disabled:cursor-not-allowed disabled:opacity-55",
          checked ? "justify-end border-brand-pink/50 bg-brand-pink/45" : "justify-start border-white/15 bg-black/35",
        )}
      >
        <span className="h-9 w-9 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
      </button>
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
    <div className="flex min-h-16 items-center gap-3 border-b border-white/8 px-4 py-4 last:border-b-0 sm:px-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-white/55">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white">{label}</span>
        {description ? <span className="mt-1 block text-xs leading-5 text-white/50">{description}</span> : null}
      </span>
      {value ? <span className="max-w-[12rem] truncate text-sm font-semibold text-white/65">{value}</span> : null}
      {badge ? <span className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/65">{badge}</span> : null}
    </div>
  );
}

type KandyActionRowProps = {
  label: string;
  description?: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export function KandyActionRow({
  label,
  description,
  icon: Icon,
  href,
  onClick,
  destructive = false,
  disabled = false,
}: KandyActionRowProps) {
  const content = (
    <>
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", destructive ? "border-red-400/25 bg-red-500/10 text-red-200" : "border-white/10 bg-black/25 text-white/60")}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className={cn("block text-sm font-bold", destructive ? "text-red-100" : "text-white")}>{label}</span>
        {description ? <span className="mt-1 block text-xs leading-5 text-white/50">{description}</span> : null}
      </span>
      <ChevronRight className={cn("h-4 w-4 shrink-0", destructive ? "text-red-200/80" : "text-white/45")} aria-hidden="true" />
    </>
  );
  const className = cn(
    "flex min-h-[4.5rem] w-full items-center gap-3 border-b border-white/8 px-4 py-3 text-left transition last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-purple disabled:cursor-not-allowed disabled:opacity-55 sm:px-5",
    destructive ? "hover:bg-red-500/8" : "hover:bg-white/5",
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {content}
    </button>
  );
}
