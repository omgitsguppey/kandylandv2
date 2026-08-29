"use client";

import type { ReactNode } from "react";

type AdminDebugWorkstreamProps = {
    eyebrow: string;
    title: string;
    subtitle: string;
    children: ReactNode;
};

export function AdminDebugWorkstream({ eyebrow, title, subtitle, children }: AdminDebugWorkstreamProps) {
    return (
        <section className="space-y-4" data-admin-debug-workstream={eyebrow.toLowerCase().replace(/\s+/g, "-")}>
            <header className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-kandy-lilac">{eyebrow}</p>
                    <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/62">{subtitle}</p>
                </div>
                <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.13em] text-white/40">Drill down as needed</p>
            </header>
            <div className="space-y-4">{children}</div>
        </section>
    );
}
