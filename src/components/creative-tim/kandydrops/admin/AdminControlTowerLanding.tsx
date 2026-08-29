"use client";

import type { ReactNode } from "react";

type AdminControlTowerLandingProps = {
    children: ReactNode;
    evidenceStatus: ReactNode;
    fixtureNotice?: ReactNode;
    subtitle: string;
    truthLabel: string;
};

export function AdminControlTowerLanding({
    children,
    evidenceStatus,
    fixtureNotice,
    subtitle,
    truthLabel,
}: AdminControlTowerLandingProps) {
    return (
        <section className="space-y-3 md:space-y-4" data-admin-control-tower-landing="true">
            <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-black/35 to-brand-purple/10 p-4 shadow-xl shadow-black/20 md:p-5">
                <div aria-hidden="true" className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-brand-purple/20 blur-3xl" />
                <div aria-hidden="true" className="absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-kandy-lilac/60 to-transparent" />
                <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-kandy-lilac">Control tower</p>
                        <h1 className="mt-2 font-serif text-3xl font-black tracking-tight text-white md:text-4xl">Platform overview</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">{subtitle}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/25 p-3 shadow-inner shadow-black/20">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Evidence status</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">{evidenceStatus}</div>
                        <p className="mt-2 text-sm font-medium text-gray-300">{truthLabel}</p>
                    </div>
                </div>
            </header>

            {fixtureNotice}
            {children}
        </section>
    );
}
