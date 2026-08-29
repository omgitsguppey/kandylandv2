import type { ReactNode } from "react";

type CreatorAccessStateSectionProps = {
    action: ReactNode;
    eyebrow: string;
    heading: string;
    status: ReactNode;
    summary: string;
};

export function CreatorAccessStateSection({
    action,
    eyebrow,
    heading,
    status,
    summary,
}: CreatorAccessStateSectionProps) {
    return (
        <section aria-labelledby="creator-access-state-heading" className="relative isolate overflow-hidden border-y border-white/10 py-6 sm:py-8">
            <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-brand-purple/15 blur-3xl" />
            <div className="relative max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-widest text-purple-200">{eyebrow}</p>
                <h1 id="creator-access-state-heading" className="mt-2 text-2xl font-black tracking-tight text-white">{heading}</h1>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{summary}</p>
            </div>

            <div className="relative mt-6 space-y-4 border-t border-white/10 pt-4">
                <div aria-label="Creator application status" className="flex flex-wrap gap-2">
                    {status}
                </div>
                <div>{action}</div>
            </div>
        </section>
    );
}
