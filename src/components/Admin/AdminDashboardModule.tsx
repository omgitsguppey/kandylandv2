"use client";

import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface AdminDashboardModuleProps {
    title: string;
    description?: string;
    defaultOpen?: boolean;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}

export function AdminDashboardModule({
    title,
    description,
    defaultOpen = false,
    actions,
    children,
    className,
}: AdminDashboardModuleProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <section className={cn("glass-panel overflow-hidden rounded-[1.7rem] border border-white/10", className)}>
            <button
                type="button"
                onClick={() => setIsOpen((current) => !current)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left md:px-5"
            >
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-white md:text-lg">{title}</h2>
                    {description ? <p className="mt-1 text-sm leading-relaxed text-gray-400">{description}</p> : null}
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
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/35 text-gray-300">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-180" : "rotate-0")} />
                    </span>
                </div>
            </button>

            {isOpen ? (
                <div className="border-t border-white/10 px-4 py-4 md:px-5">
                    {actions ? <div className="mb-4 flex flex-wrap items-center gap-2 md:hidden">{actions}</div> : null}
                    {children}
                </div>
            ) : null}
        </section>
    );
}
