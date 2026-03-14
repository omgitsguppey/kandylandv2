"use client";

import { useUI } from "@/context/UIContext";
import { ArrowRight, Clock3, Images, PlayCircle, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { EditableImage } from "@/components/Admin/EditableImage";
import { useDrops } from "@/hooks/useDrops";
import { GUMDROPS_SUPPORT_COPY, SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";

export function LivePreviews() {
    const { openAuthModal } = useUI();
    const { drops } = useDrops();
    const fallbackMedia = "/candy-3d-glass.png";
    const previewImages = Array.from({ length: 4 }, (_, index) => drops[index]?.imageUrl || fallbackMedia);
    const featuredDrop = drops[0];

    return (
        <section className="relative border-t border-white/5 bg-zinc-950 py-12 sm:py-20">
            <div className="mx-auto w-full max-w-7xl px-4 text-center sm:px-6 lg:px-8">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-brand-purple">Library Preview</p>
                <h2 className="mb-4 text-[2rem] font-extrabold tracking-tight text-white sm:mb-5 sm:text-4xl md:text-5xl">See your library before you join</h2>
                <p className="mx-auto mb-7 max-w-xl text-sm leading-6 text-gray-400 sm:mb-10 sm:text-lg">
                    This is where your unwrapped Kandy stays ready to watch after the live drop disappears.
                </p>

                <div className="mb-4 flex flex-wrap items-center justify-center gap-2 sm:mb-5">
                    <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-xs font-bold text-brand-purple">Keep access after unwrap</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-200">Watch on mobile</span>
                </div>

                <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[1.6rem] border border-white/10 bg-black shadow-2xl shadow-black/40">
                    <div className="grid lg:grid-cols-[minmax(0,1.15fr)_20rem]">
                        <div className="p-3.5 sm:p-5">
                            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-left">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-purple">Unlocked experience</p>
                                    <h3 className="mt-1 text-lg font-extrabold leading-tight text-white sm:text-2xl">
                                        The same viewer layout guests get after they unwrap.
                                    </h3>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white">
                                        <Clock3 className="mr-1 inline h-3.5 w-3.5 text-brand-purple" />
                                        Ends in 5 days
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white">
                                        <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-brand-purple" />
                                        Keep access
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-[1.45rem] border border-white/10 bg-[#11111A] p-2.5 sm:p-3.5">
                                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-full border border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                                            Library
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300">
                                            Viewer
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Preview</span>
                                </div>

                                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem]">
                                    <div className="space-y-3">
                                        <div className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-black" style={{ aspectRatio: "16 / 9" }}>
                                            <EditableImage
                                                id="landing-library-stage"
                                                defaultSrc={previewImages[0]}
                                                alt="Library viewer stage"
                                                fill
                                                className="object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                                            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                                                <span className="rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-[10px] font-bold text-white">
                                                    <PlayCircle className="mr-1 inline h-3.5 w-3.5 text-brand-purple" />
                                                    Taste your Kandy
                                                </span>
                                                <span className="rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-[10px] font-bold text-white">
                                                    <Images className="mr-1 inline h-3.5 w-3.5 text-brand-purple" />
                                                    +4 unlocked files
                                                </span>
                                            </div>
                                            <div className="absolute inset-x-0 bottom-0 p-3 text-left sm:p-4">
                                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                                    <span className="rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-bold text-gray-100">
                                                        {featuredDrop?.title || "Featured KandyDrop"}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">Saved to your library</p>
                                                <h4 className="mt-1 text-base font-bold leading-tight text-white sm:text-lg">
                                                    Unwrapped Kandy stays ready to watch after the live drop ends.
                                                </h4>
                                                <p className="mt-1 max-w-xl text-xs leading-5 text-gray-300">
                                                    A real viewer stage, a thumbnail rail, and the same mobile-first feel users get after unlocking.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            {previewImages.map((imageSrc, index) => (
                                                <div
                                                    key={index}
                                                    className={`rounded-2xl border p-1.5 ${index === 0 ? "border-brand-purple/50 bg-brand-purple/12" : "border-white/10 bg-white/[0.03]"}`}
                                                >
                                                    <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: "1 / 1" }}>
                                                        <EditableImage
                                                            id={`landing-library-thumb-${index + 1}`}
                                                            defaultSrc={imageSrc}
                                                            alt="Library thumbnail"
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Now watching</p>
                                            <p className="mt-2 text-sm font-bold text-white">The viewer feels like the real product</p>
                                            <p className="mt-1 text-xs leading-5 text-gray-400">Guests see a clear preview of what changes after they unwrap.</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Mobile fit</p>
                                            <p className="mt-2 text-sm font-bold text-white">Shorter stage, tighter spacing</p>
                                            <p className="mt-1 text-xs leading-5 text-gray-400">The mock now fits iPhone and Android screens more naturally.</p>
                                        </div>
                                        <div className="rounded-2xl border border-brand-purple/20 bg-brand-purple/10 p-3 text-left">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">Why join</p>
                                            <p className="mt-2 text-sm font-bold text-white">Unwrap now, keep it later</p>
                                            <p className="mt-1 text-xs leading-5 text-gray-300">The value is simple: unwrap the live drop now and keep access in your library.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-between border-t border-white/10 bg-[radial-gradient(circle_at_top,rgba(178,140,255,0.2),rgba(17,17,26,0.92)_52%,rgba(0,0,0,0.96)_100%)] p-4 text-left sm:p-5 lg:border-l lg:border-t-0">
                            <div className="space-y-4">
                                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Guest preview
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">Unwrap live, then keep your Kandy close.</h3>
                                    <p className="mt-2 text-sm leading-6 text-gray-300">
                                        The library is where exclusive files stay easy to revisit after the live window is over.
                                    </p>
                                </div>
                                <details className="rounded-2xl border border-white/10 bg-black/30 text-sm text-gray-200">
                                    <summary className="cursor-pointer list-none px-3 py-3 font-semibold text-white">
                                        Why this matters on mobile
                                    </summary>
                                    <div className="space-y-2 border-t border-white/10 px-3 py-3 leading-6 text-gray-300">
                                        <p>A viewer stage that looks like the real content experience.</p>
                                        <p>Thumbnail rails and file counts that match the live product language.</p>
                                        <p>A tighter frame that shows more content and less dead space on phones.</p>
                                    </div>
                                </details>
                            </div>

                            <div className="mt-6 space-y-3">
                                <button
                                    onClick={() => openAuthModal("signup")}
                                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-extrabold text-white shadow-[0_0_30px_rgba(178,140,255,0.35)] transition-all hover:shadow-[0_0_36px_rgba(178,140,255,0.5)]"
                                >
                                    {SECONDARY_UNWRAP_CTA} <ArrowRight className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => openAuthModal("signup")}
                                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-brand-purple/40 bg-brand-purple/20 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-brand-purple/30"
                                >
                                    <Wallet className="h-4 w-4" />
                                    Get Gum Drops
                                </button>
                                <p className="text-xs leading-6 text-gray-400">
                                    Create your free profile before the current KandyDrop disappears from the drops page.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 space-y-4 sm:mt-20 sm:space-y-6">
                    <h3 className="text-2xl font-bold text-white sm:text-3xl">Ready to keep your Kandy?</h3>
                    <p className="mx-auto max-w-md text-sm leading-relaxed text-gray-400 sm:text-base">{GUMDROPS_SUPPORT_COPY}</p>
                    <button
                        onClick={() => openAuthModal("signup")}
                        className="mx-auto mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-purple to-purple-500 px-6 py-4 font-extrabold text-white shadow-xl transition-all hover:shadow-[0_0_40px_rgba(178,140,255,0.5)] active:scale-[0.98] sm:mt-4 sm:w-auto sm:px-10 sm:py-5"
                    >
                        {SECONDARY_UNWRAP_CTA} <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </section>
    );
}
