import type { ReactNode } from "react";

import type { LockedDropPreviewCreator, LockedDropPreviewSafeDrop } from "@/lib/locked-drop-preview-truth";

interface DropPreviewExperienceFrameProps {
    drop: LockedDropPreviewSafeDrop;
    creator: LockedDropPreviewCreator | null;
    children: ReactNode;
}

export function DropPreviewExperienceFrame({ drop, creator, children }: DropPreviewExperienceFrameProps) {
    const creatorLabel = creator?.username
        ? `@${creator.username}`
        : creator?.displayName ?? "KandyDrops Creator";
    const tags = Array.isArray(drop.tags) ? drop.tags.slice(0, 2) : [];

    return (
        <div className="creative-tim-drop-preview-frame relative isolate overflow-x-clip">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_8%_8%,rgba(178,140,255,0.28),transparent_28%),radial-gradient(circle_at_89%_10%,rgba(255,111,207,0.17),transparent_25%),linear-gradient(180deg,rgba(13,5,24,0.9),transparent)]" aria-hidden="true" />

            <div className="relative mx-auto w-full max-w-6xl px-3 pt-[calc(var(--kandy-cookie-offset,0px)+0.75rem)] sm:px-4 md:px-8 md:pt-4">
                <section className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/35 px-5 py-6 shadow-[0_30px_100px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:px-7 sm:py-8 md:grid md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.55fr)] md:items-end md:gap-10 md:rounded-[2.35rem] md:px-10 md:py-10">
                    <div className="pointer-events-none absolute -left-8 top-2 h-40 w-40 rounded-full bg-brand-purple/28 blur-3xl" aria-hidden="true" />
                    <div className="pointer-events-none absolute -right-6 bottom-0 h-44 w-44 rounded-full bg-[#ff6fcf]/16 blur-3xl" aria-hidden="true" />

                    <div className="relative max-w-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-purple">Sealed release</p>
                        <h1 className="mt-3 text-3xl font-black leading-[0.98] tracking-[-0.05em] text-white sm:text-4xl md:text-5xl">{drop.title}</h1>
                        <p className="mt-4 max-w-xl text-sm leading-6 text-gray-300 md:text-base md:leading-7">{drop.description}</p>
                    </div>

                    <div className="relative mt-6 flex flex-wrap items-center gap-2 md:mt-0 md:justify-end">
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-white/85">{creatorLabel}</span>
                        <span className="rounded-full border border-brand-purple/35 bg-brand-purple/12 px-3 py-1.5 text-xs font-black text-[#efe8ff]">{drop.unlockCost.toLocaleString()} GD</span>
                        {tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold text-gray-300">{tag}</span>
                        ))}
                    </div>
                </section>
            </div>

            <div className="relative z-10">{children}</div>

            <style>{`
                .creative-tim-drop-preview-frame [data-drop-preview-page="true"] {
                    max-width: 72rem;
                    padding-top: 1rem;
                }

                .creative-tim-drop-preview-frame [data-drop-preview-page="true"] > section {
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 2rem;
                    padding: clamp(1rem, 3vw, 2rem);
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.055), rgba(178, 140, 255, 0.045) 48%, rgba(0, 0, 0, 0.22));
                    box-shadow: 0 28px 90px rgba(0, 0, 0, 0.24);
                }

                .creative-tim-drop-preview-frame [data-drop-preview-cover-treatment] {
                    box-shadow: 0 34px 100px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(178, 140, 255, 0.15);
                }

                .creative-tim-drop-preview-frame [data-drop-preview-sticky-cta-above-bottom-nav="true"] {
                    border-color: rgba(178, 140, 255, 0.36);
                    background: rgba(11, 5, 20, 0.9);
                    box-shadow: 0 20px 72px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(178, 140, 255, 0.12);
                }

                @media (min-width: 768px) {
                    .creative-tim-drop-preview-frame [data-drop-preview-page="true"] {
                        padding-top: 1.5rem;
                    }
                }
            `}</style>
        </div>
    );
}
