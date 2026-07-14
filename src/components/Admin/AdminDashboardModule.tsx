"use client";

import { ReactNode, useState } from "react";
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
        <section className={cn("glass-panel min-w-0 overflow-hidden rounded-[1.28rem] border border-white/10", className)}>
            <div className="flex min-w-0 w-full items-center justify-between gap-3 px-3.5 py-3 md:px-4">
                <button
                    type="button"
                    onClick={() => handleOpenChange(!resolvedOpen)}
                    aria-expanded={resolvedOpen}
                    className="min-w-0 flex-1 text-left"
                >
                    <h2 className="text-[15px] font-bold text-white">{title}</h2>
                    {description ? <p className="mt-0.5 text-[11px] leading-5 text-gray-400 md:text-xs">{description}</p> : null}
                </button>
                <div className="flex shrink-0 items-center gap-2">
                    {actions ? (
                        <div
                            className="hidden items-center gap-2 md:flex"
                        >
                            {actions}
                        </div>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => handleOpenChange(!resolvedOpen)}
                        aria-expanded={resolvedOpen}
                        aria-label={`${resolvedOpen ? "Collapse" : "Expand"} ${title}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/35 text-gray-300"
                    >
                        <ChevronDown aria-hidden="true" className={cn("h-4 w-4 transition-transform", resolvedOpen ? "rotate-180" : "rotate-0")} />
                    </button>
                </div>
            </div>

            {resolvedOpen ? (
                <div className="min-w-0 overflow-hidden border-t border-white/10 px-3.5 py-3 md:px-4">
                    {actions ? <div className="mb-2.5 flex flex-wrap items-center gap-2 md:hidden">{actions}</div> : null}
                    {children}
                </div>
            ) : null}
        </section>
    );
}
