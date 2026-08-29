import type { ReactNode } from "react";
import { BadgeCheck, FileText, Sparkles } from "lucide-react";
import { CreatorApplicationMilestonePath } from "./CreatorApplicationMilestonePath";

type CreatorApplicationLandingProps = {
    accountNotice?: ReactNode;
    primaryAction: ReactNode;
    secondaryAction: ReactNode;
};

export function CreatorApplicationLanding({
    accountNotice,
    primaryAction,
    secondaryAction,
}: CreatorApplicationLandingProps) {
    return (
        <div className="relative mx-auto w-full max-w-6xl overflow-hidden px-4 sm:px-6">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-10 h-96 bg-[radial-gradient(circle_at_20%_20%,rgba(178,140,255,0.28),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(255,111,207,0.16),transparent_26%)] blur-3xl" />

            <div className="relative space-y-5 pb-8">
                <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#120a20]/90 shadow-[0_26px_90px_rgba(0,0,0,0.46)] backdrop-blur-xl">
                    <div className="p-6 sm:p-9">
                        <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/30 bg-brand-purple/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-purple-100">
                            <Sparkles className="h-4 w-4" />
                            Creator program
                        </div>
                        <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                            Make your audience something they can unwrap.
                        </h1>
                        <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-300 sm:text-base">
                            KandyDrops gives creators a focused home for limited drops, direct audience moments, and paid experiences without turning your work into another endless feed.
                        </p>

                        <div className="mt-7 flex flex-wrap gap-3">
                            {primaryAction}
                            {secondaryAction}
                        </div>

                        {accountNotice ? <div className="mt-5">{accountNotice}</div> : null}
                    </div>
                </section>

                <CreatorApplicationMilestonePath />

                <section aria-label="Application review promises" className="space-y-3">
                    <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:p-6">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-purple/15 text-brand-purple">
                                <BadgeCheck className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="text-sm font-bold text-white">A review process with a real status</p>
                                <p className="mt-1 text-sm text-zinc-400">Your waiting page names the next needed step instead of leaving you to guess.</p>
                            </div>
                        </div>
                    </article>

                    <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:p-6">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-pink/10 text-brand-pink">
                                <FileText className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="text-sm font-bold text-white">Everything important stays in the app</p>
                                <p className="mt-1 text-sm text-zinc-400">Identity verification and agreement milestones remain tied to your application.</p>
                            </div>
                        </div>
                    </article>
                </section>
            </div>
        </div>
    );
}
