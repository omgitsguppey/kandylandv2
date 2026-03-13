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

    return (
        <section className="relative border-t border-white/5 bg-zinc-950 py-16 sm:py-24">
            <div className="mx-auto w-full max-w-7xl px-4 text-center sm:px-6 lg:px-8">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-brand-purple">Library Preview</p>
                <h2 className="mb-4 text-3xl font-extrabold text-white sm:mb-6 sm:text-4xl md:text-5xl">Your Kandy Library</h2>
                <p className="mx-auto mb-10 max-w-2xl text-base text-gray-400 sm:mb-16 sm:text-lg">
                    Unwrap live KandyDrops on mobile, then come back to your library anytime to watch what you already unlocked.
                </p>

                <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-xs font-bold text-brand-purple">Keep access after unwrap</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-200">Watch on mobile</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-200">Limited-time drops</span>
                </div>

                <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-black shadow-2xl shadow-black/40">
                    <div className="grid lg:grid-cols-[minmax(0,1.2fr)_22rem]">
                        <div className="p-4 sm:p-6">
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-left">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-purple">Visual Mock</p>
                                    <h3 className="mt-1 text-xl font-extrabold text-white sm:text-2xl">A cleaner look at the library guests unlock into.</h3>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white">
                                        <Clock3 className="mr-1 inline h-3.5 w-3.5 text-brand-purple" />
                                        Ends in 5 days
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white">
                                        <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-brand-purple" />
                                        Keep forever after unwrap
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-[1.75rem] border border-white/10 bg-[#11111A] p-3 sm:p-4">
                                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-full border border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                                            Library
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300">
                                            Viewer
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Guest preview only</span>
                                </div>

                                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem]">
                                    <div className="space-y-3">
                                        <div className="relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-black" style={{ aspectRatio: "16 / 10" }}>
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
                                                    Main preview
                                                </span>
                                                <span className="rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-[10px] font-bold text-white">
                                                    <Images className="mr-1 inline h-3.5 w-3.5 text-brand-purple" />
                                                    4 unlocked files
                                                </span>
                                            </div>
                                            <div className="absolute inset-x-0 bottom-0 p-4 text-left sm:p-5">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">Unlocked in library</p>
                                                <h4 className="mt-1 text-lg font-bold text-white sm:text-xl">Private content that stays with you after the public drop expires.</h4>
                                                <p className="mt-1 max-w-xl text-xs leading-5 text-gray-300 sm:text-sm">
                                                    This is a visual preview only, built to show the stage, thumbnails, and saved access guests unlock.
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

                                    <div className="grid gap-3">
                                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Access</p>
                                            <p className="mt-2 text-base font-bold text-white">Saved to your library</p>
                                            <p className="mt-1 text-xs leading-5 text-gray-400">Unwrapped drops stay easy to find after the live window ends.</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Mobile fit</p>
                                            <p className="mt-2 text-base font-bold text-white">Top stage, bottom rail</p>
                                            <p className="mt-1 text-xs leading-5 text-gray-400">A shorter, clearer layout that actually shows the content area.</p>
                                        </div>
                                        <div className="rounded-2xl border border-brand-purple/20 bg-brand-purple/10 p-3 text-left">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">Files</p>
                                            <p className="mt-2 text-base font-bold text-white">Images, video, and extras</p>
                                            <p className="mt-1 text-xs leading-5 text-gray-300">A single preview stage with a file switcher beneath it keeps the mock readable.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-between border-t border-white/10 bg-[radial-gradient(circle_at_top,rgba(178,140,255,0.2),rgba(17,17,26,0.92)_52%,rgba(0,0,0,0.96)_100%)] p-5 text-left sm:p-6 lg:border-l lg:border-t-0">
                            <div className="space-y-4">
                                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Guest preview
                                </div>
                                <div>
                                    <h3 className="text-2xl font-extrabold text-white">Unwrap live, then keep it in your Kandy library.</h3>
                                    <p className="mt-2 text-sm leading-6 text-gray-300">
                                        Guests should immediately understand what they are working toward: a clean, private place to rewatch what they already unlocked.
                                    </p>
                                </div>
                                <div className="space-y-2 text-sm text-gray-200">
                                    <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">Shorter preview height with a real viewer-style stage</div>
                                    <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">Thumbnails, file count, and saved access shown at a glance</div>
                                    <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">CTA stack aligned beside the mock instead of floating over it</div>
                                </div>
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
                                    Create your free profile before the current KandyDrop disappears from the live page.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-14 space-y-4 sm:mt-24 sm:space-y-6">
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
