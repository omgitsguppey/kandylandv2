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
        <section className={cn("glass-panel overflow-hidden rounded-[1.4rem] border border-white/10", className)}>
            <button
                type="button"
                onClick={() => handleOpenChange(!resolvedOpen)}
                aria-expanded={resolvedOpen}
                className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left md:px-5"
            >
                <div className="min-w-0">
                    <h2 className="text-[15px] font-bold text-white md:text-base">{title}</h2>
                    {description ? <p className="mt-1 text-xs leading-relaxed text-gray-400 md:text-[13px]">{description}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {actions ? (
                        <div
                            className="hidden items-center gap-2 md:flex"
                            onClick={(event) => event.stopPropagation()}
                        >
                            {actions}
                        </div>
                    ) : null}
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/35 text-gray-300">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", resolvedOpen ? "rotate-180" : "rotate-0")} />
                    </span>
                </div>
            </button>

            {resolvedOpen ? (
                <div className="border-t border-white/10 px-4 py-3.5 md:px-5">
                    {actions ? <div className="mb-3 flex flex-wrap items-center gap-2 md:hidden">{actions}</div> : null}
                    {children}
                </div>
            ) : null}
        </section>
    );
}
