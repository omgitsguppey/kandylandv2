import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import React from 'react';

export function SectionContainer({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
    return (
        <section id={id} className="mb-6 last:mb-0">
            <h2 className="mb-2 px-4 text-[11px] font-extrabold uppercase tracking-widest text-gray-500">{title}</h2>
            <div className="overflow-hidden rounded-3xl bg-white/5 border border-white/5">
                {children}
            </div>
        </section>
    );
}

export function NavigationRow({
    icon,
    label,
    description,
    onClick,
    href,
    destructive,
}: {
    icon?: React.ReactNode;
    label: string;
    description?: string;
    onClick?: () => void;
    href?: string;
    destructive?: boolean;
}) {
    const ComponentContent = (
        <>
            <div className="flex items-center gap-3 min-w-0">
                {icon && <div className={cn("shrink-0", destructive ? "text-red-500" : "text-gray-400")}>{icon}</div>}
                <div className="min-w-0 flex-1 text-left">
                    <p className={cn("truncate text-sm font-medium", destructive ? "text-red-500" : "text-gray-200")}>{label}</p>
                    {description && <p className="truncate text-xs text-gray-500">{description}</p>}
                </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-600" />
        </>
    );
    const className = "flex w-full items-center justify-between gap-4 py-3.5 px-4 transition-colors hover:bg-white/5 focus:bg-white/5 outline-none";
    
    if (href) {
        // @ts-ignore
        return <Link href={href} onClick={onClick} className={className}>{ComponentContent}</Link>;
    }
    return <button type="button" onClick={onClick} className={className}>{ComponentContent}</button>;
}

export function ToggleRow({
    label,
    description,
    checked,
    onChange,
    icon,
    disabled = false,
    badge,
    destructive,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    badge?: string;
    destructive?: boolean;
}) {
    return (
        <div className={cn("flex w-full items-center justify-between gap-4 py-3.5 px-4", disabled && "opacity-60")}>
            <div className="flex items-start gap-3 min-w-0 flex-1">
                {icon && <div className="mt-0.5 shrink-0 text-gray-400">{icon}</div>}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className={cn("text-sm font-medium", destructive ? "text-red-400" : "text-gray-200")}>{label}</p>
                        {badge && (
                            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                {badge}
                            </span>
                        )}
                    </div>
                    {description && <p className="mt-0.5 text-xs text-gray-500 leading-tight pr-4">{description}</p>}
                </div>
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                disabled={disabled}
                className={cn(
                    "relative h-[22px] w-10 shrink-0 rounded-full transition-colors",
                    checked ? (destructive ? "bg-red-500" : "bg-brand-purple") : "bg-white/10",
                    disabled && "cursor-not-allowed"
                )}
                aria-label={label + " toggle"}
                aria-pressed={checked}
            >
                <span className={cn(
                    "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-all shadow-sm",
                    checked ? "left-[1.125rem]" : "left-[2px]"
                )} />
            </button>
        </div>
    );
}

export function StaticRow({
    label,
    description,
    icon,
    badge,
}: {
    label: string;
    description?: string;
    icon?: React.ReactNode;
    badge?: string;
}) {
    return (
        <div className="flex w-full items-start gap-3 py-3.5 px-4 bg-black/20">
            {icon && <div className="mt-0.5 shrink-0 text-brand-purple/70">{icon}</div>}
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-gray-300">{label}</p>
                    {badge && (
                        <span className="rounded-md bg-brand-purple/15 border border-brand-purple/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-purple">
                            {badge}
                        </span>
                    )}
                </div>
                {description && <p className="mt-0.5 text-xs text-gray-500 leading-tight">{description}</p>}
            </div>
        </div>
    );
}

export function ValueInputRow({
    label,
    description,
    value,
    onChange,
    type = "text",
    min,
    step,
    disabled = false,
    icon,
    placeholder
}: {
    label: string;
    description?: string;
    value: string | number;
    onChange: (val: string) => void;
    type?: string;
    min?: number;
    step?: number;
    disabled?: boolean;
    icon?: React.ReactNode;
    placeholder?: string;
}) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 bg-black/30">
            <div className="flex items-start gap-3 min-w-0 flex-1">
                {icon && <div className="mt-0.5 shrink-0 text-gray-400">{icon}</div>}
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-300">{label}</p>
                    {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
                </div>
            </div>
            <input
                type={type}
                min={min}
                step={step}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                placeholder={placeholder}
                className="w-full sm:w-48 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
            />
        </div>
    );
}

export function RowDivider() {
    return <div className="h-px w-full bg-white/5 ml-4" />;
}

