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
            <header className="min-w-0 space-y-2 wrap-anywhere">
                <div className="min-w-0 wrap-anywhere">
                    <p className="text-xs font-semibold tracking-wide text-primary min-w-0 wrap-anywhere">{eyebrow}</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground min-w-0 wrap-anywhere">{subtitle}</p>
                </div>
                
            </header>
            <div className="space-y-4 min-w-0 wrap-anywhere">{children}</div>
        </section>
    );
}
