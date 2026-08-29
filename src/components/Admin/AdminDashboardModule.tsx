"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface AdminDashboardModuleProps {
    title: string;
    description?: string;
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}

export function AdminDashboardModule({
    title,
    description,
    defaultOpen = false,
    open,
    onOpenChange,
    actions,
    children,
    className,
}: AdminDashboardModuleProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const resolvedOpen = typeof open === "boolean" ? open : isOpen;

    const handleOpenChange = (nextOpen: boolean) => {
        if (typeof open !== "boolean") {
            setIsOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
    };

    return (
        <section
            className={cn(
                "relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-black/30 to-brand-purple/[0.045] shadow-xl shadow-black/15",
                className,
            )}
            data-admin-dashboard-module={title}
        >
            <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-kandy-lilac via-brand-purple to-brand-pink" />
            <header className="relative flex min-w-0 items-center gap-3 border-b border-white/10 px-4 py-3 md:px-5">
                <button
                    type="button"
                    onClick={() => handleOpenChange(!resolvedOpen)}
                    aria-expanded={resolvedOpen}
                    className="min-h-11 min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-kandy-lilac"
                >
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-kandy-lilac/80">Operational module</p>
                    <h2 className="mt-1 text-lg font-black tracking-tight text-white">{title}</h2>
                    {description ? <p className="mt-1 text-sm leading-5 text-gray-400">{description}</p> : null}
                </button>
                <div className="flex shrink-0 items-center gap-2">
                    {actions ? <div className="hidden items-center gap-2 md:flex">{actions}</div> : null}
                    <button
                        type="button"
                        onClick={() => handleOpenChange(!resolvedOpen)}
                        aria-expanded={resolvedOpen}
                        aria-label={`${resolvedOpen ? "Collapse" : "Expand"} ${title}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-gray-300 transition-colors hover:border-kandy-lilac/35 hover:bg-white/[0.07] hover:text-white"
                    >
                        <ChevronDown aria-hidden="true" className={cn("h-4 w-4 transition-transform duration-200", resolvedOpen ? "rotate-180" : "rotate-0")} />
                    </button>
                </div>
            </header>
            {resolvedOpen ? (
                <div className="relative min-w-0 overflow-hidden p-4 md:p-5">
                    {actions ? <div className="mb-3 flex flex-wrap items-center gap-2 md:hidden">{actions}</div> : null}
                    {children}
                </div>
            ) : null}
        </section>
    );
}
