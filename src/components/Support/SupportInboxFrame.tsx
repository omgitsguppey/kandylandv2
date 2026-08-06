import type { ReactNode } from "react";

type SupportInboxFrameProps = {
    threadCount: number;
    children: ReactNode;
};

export function SupportInboxFrame({ threadCount, children }: SupportInboxFrameProps) {
    return (
        <div className="mx-auto w-full max-w-7xl px-3 pb-20 pt-16 sm:px-4 md:pt-[4.5rem]">
            <section className="relative overflow-hidden rounded-[2rem] border border-brand-purple/20 bg-black/45 px-5 py-5 shadow-[0_24px_80px_rgba(72,34,130,0.2)] backdrop-blur-xl md:px-6 md:py-6">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(178,140,255,0.28),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(75,16,150,0.22),transparent_45%)]" />
                <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-purple">Support</p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">In-site support inbox</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">Open tickets, track replies, and keep account or creator issues inside your dashboard.</p>
                    </div>
                    <div className="flex flex-wrap gap-2" aria-label="Support inbox summary">
                        <span className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-black/35 px-3 text-xs font-semibold text-white shadow-inner shadow-white/5">
                            {threadCount} thread{threadCount === 1 ? "" : "s"}
                        </span>
                        <span className="inline-flex min-h-11 items-center rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 text-xs font-semibold text-purple-100">
                            10s live poll
                        </span>
                    </div>
                </div>
            </section>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">{children}</div>
        </div>
    );
}
