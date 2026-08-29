"use client";

import type { ReactNode } from "react";

type AdminQueueTriageCanvasProps = {
    eyebrow: string;
    title: string;
    subtitle: string;
    backLink?: ReactNode;
    action?: ReactNode;
    beforeContent?: ReactNode;
    stateContent?: ReactNode;
    children?: ReactNode;
};

export function AdminQueueTriageCanvas({
    eyebrow,
    title,
    subtitle,
    backLink,
    action,
    beforeContent,
    stateContent,
    children,
}: AdminQueueTriageCanvasProps) {
    return (
        <main
            className="relative isolate min-h-screen overflow-x-hidden bg-kandy-void px-3 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+5.5rem)] text-white sm:px-5 lg:px-7"
            data-admin-queue-canvas="task-triage"
        >
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_8%_0%,rgba(178,140,255,0.18),transparent_42%),radial-gradient(circle_at_88%_0%,rgba(236,72,153,0.12),transparent_36%)]" />
            <div className="relative w-full">
                {beforeContent}

                <header className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(118deg,rgba(255,255,255,0.075),rgba(11,7,22,0.92)_50%,rgba(91,44,132,0.2))] p-4 shadow-[0_24px_72px_rgba(0,0,0,0.28)] lg:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0">
                            {backLink ? <div className="mb-4">{backLink}</div> : null}
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-kandy-lilac">{eyebrow}</p>
                            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h1>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/68 sm:text-base">{subtitle}</p>
                        </div>
                        {action ? <div className="shrink-0">{action}</div> : null}
                    </div>
                </header>

                {stateContent ? (
                    <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.22)] sm:p-5">
                        {stateContent}
                    </section>
                ) : (
                    <section className="mt-5 flex flex-col gap-4 2xl:flex-row 2xl:items-start [&>section:first-child]:min-w-0 [&>section:first-child]:2xl:w-80 [&>section:last-child]:min-w-0 [&>section:last-child]:2xl:flex-1">
                        {children}
                    </section>
                )}
            </div>
        </main>
    );
}
