"use client";

import type { ReactNode } from "react";
import { ArrowRight, CalendarCheck, Gift, Sparkles, Wallet } from "lucide-react";

type KandyExperiencesHeroProps = {
    liveDropCount: number;
};

type KandyExperiencesProgramProps = {
    creatorRail: ReactNode;
    dailyCheckIn: ReactNode;
    dailyTasks: ReactNode;
    liveDrops: ReactNode;
};

type KandyGumDropRefillCardProps = {
    supportCopy: string;
    primaryCta: string;
    onAction: () => void;
};

export function KandyExperiencesHero({ liveDropCount }: KandyExperiencesHeroProps) {
    const liveDropLabel = liveDropCount === 1 ? "Live Drop" : "Live Drops";

    return (
        <p
            data-experiences-hero-explainer-cards="removed"
            className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-xs leading-5 text-white/56"
        >
            <span>On the shelf:</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-pink-100">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {liveDropCount} {liveDropLabel} ready to unwrap
            </span>
        </p>
    );
}

export function KandyExperiencesProgram({
    creatorRail,
    dailyCheckIn,
    dailyTasks,
    liveDrops,
}: KandyExperiencesProgramProps) {
    return (
        <section className="space-y-7 sm:space-y-9" aria-labelledby="experiences-daily-loop-title">
            <header className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-pink-200/80">Daily Experiences</p>
                    <h2 id="experiences-daily-loop-title" className="mt-2 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl">
                        Keep your Kandy flowing daily.
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-white/70 sm:text-base">
                        Check in, complete your daily Experiences, and stay ready for the next Drop worth unwrapping.
                    </p>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-pink-100/62">
                        Your daily path
                    </p>
                </div>
                <p className="max-w-md text-sm leading-6 text-white/58 sm:text-right">
                    Start with a check-in, then make your way toward the next unwrap.
                </p>
            </header>

            <ol className="space-y-8 sm:space-y-10">
                <DailyActionPathStep number="01" icon={<CalendarCheck className="h-4 w-4" />} eyebrow="First move" title="Check in for today">
                    {dailyCheckIn}
                </DailyActionPathStep>
                <DailyActionPathStep number="02" icon={<Gift className="h-4 w-4" />} eyebrow="Keep going" title="Complete your missions">
                    {dailyTasks}
                </DailyActionPathStep>
                <DailyActionPathStep number="03" icon={<Sparkles className="h-4 w-4" />} eyebrow="Then unwrap" title="Explore live Drops">
                    {liveDrops}
                </DailyActionPathStep>
            </ol>

            <section className="border-t border-white/10 pt-6 sm:pt-8" aria-labelledby="experiences-creators-title">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-purple-200/80">Creators to watch</p>
                        <h2 id="experiences-creators-title" className="mt-2 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
                            Keep a little closer to the people making your next Drop.
                        </h2>
                    </div>
                </div>
                {creatorRail}
            </section>
        </section>
    );
}

export function KandyGumDropRefillCard({ supportCopy, primaryCta, onAction }: KandyGumDropRefillCardProps) {
    return (
        <section id="gumdrops-wallet" className="relative overflow-hidden rounded-[1.5rem] border border-pink-100/15 bg-[linear-gradient(110deg,rgba(76,17,93,0.74),rgba(20,6,31,0.92)_58%,rgba(104,20,82,0.58))] shadow-[0_20px_55px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <div className="pointer-events-none absolute right-0 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full bg-fuchsia-300/14 blur-[56px] motion-reduce:hidden" aria-hidden="true" />
            <div className="relative flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-pink-100/20 bg-white/[0.08] text-pink-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                    <Wallet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-pink-100/75">Keep the shelf within reach</p>
                        <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-white sm:text-2xl">Need GumDrops before your next unwrap?</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/66">{supportCopy}</p>
                    </div>
                </div>
                <div className="shrink-0 sm:text-right">
                    <button
                        type="button"
                        onClick={onAction}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-pink-100/30 bg-[linear-gradient(135deg,#f9a8d4,#d946ef_42%,#9333ea)] px-6 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(217,70,239,0.34),inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95"
                    >
                        Get GumDrops
                        <ArrowRight className="h-4 w-4" />
                    </button>
                    <p className="mt-2 max-w-xs text-xs leading-5 text-pink-100/55 sm:ml-auto">{primaryCta}</p>
                </div>
            </div>
        </section>
    );
}

function DailyActionPathStep({
    number,
    icon,
    eyebrow,
    title,
    children,
}: {
    number: string;
    icon: ReactNode;
    eyebrow: string;
    title: string;
    children: ReactNode;
}) {
    return (
        <li className="relative">
            <div className="flex items-start gap-3 border-l border-white/10 pl-4 sm:pl-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-pink-100/20 bg-pink-200/10 text-[10px] font-black tracking-[0.14em] text-pink-100">
                    {number}
                </span>
                <div className="min-w-0 pt-0.5">
                    <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-pink-100/70">
                        {icon}
                        {eyebrow}
                    </p>
                    <h3 className="mt-1 text-xl font-black tracking-[-0.035em] text-white">{title}</h3>
                </div>
            </div>
            <div className="mt-4 sm:pl-14">{children}</div>
        </li>
    );
}
