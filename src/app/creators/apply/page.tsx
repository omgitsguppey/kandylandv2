"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, FileText, ShieldCheck, Sparkles, Users } from "lucide-react";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { CREATOR_WAITLIST_PATH } from "@/lib/creator-application";
import { trackEvent } from "@/lib/telemetry";

const CREATOR_STEPS = [
    {
        title: "Tell us about your creator lane",
        description: "Share your creator name, main platform, and the kind of content you make so admins can route your application correctly.",
        icon: Sparkles,
    },
    {
        title: "Lock your creator identity",
        description: "Choose your creator handle and confirm you meet the creator age requirement before review starts.",
        icon: Users,
    },
    {
        title: "Join the creator line",
        description: "Finish signup and we'll hold your place while admins handle legal docs, ID verification, and manual segmenting.",
        icon: ShieldCheck,
    },
] as const;

export default function CreatorApplyPage() {
    const { user, userProfile, loading } = useAuth();
    const { openAuthModal } = useUI();
    const hasCreatorApplication = Boolean(userProfile?.creatorApplication);

    const handleStartCreatorSignup = () => {
        trackEvent("navigation_click", {
            destination: "/creators/apply",
            source: "creator_apply_page",
            action: "start_creator_signup",
        });
        openAuthModal("creator_signup");
    };

    return (
        <main className="min-h-screen bg-black px-4 pb-20 pt-28 text-white sm:px-6">
            <PageViewEvent
                eventName="creator_apply_viewed"
                eventParams={{ component_name: "creator_apply_page", creator_lane: "intake" }}
            />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
                <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
                    <div className="max-w-2xl">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
                            Creator signup
                        </span>
                        <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                            Join the creator line in 3 simple steps
                        </h1>
                        <p className="mt-4 max-w-xl text-sm leading-7 text-gray-300 sm:text-base">
                            Creator signup stays separate from the regular fan onboarding lane. We&apos;ll place you in line first, then handle legal docs, ID verification, and manual segmenting before creator tools are enabled.
                        </p>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                        {loading ? (
                            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
                                Checking your account...
                            </span>
                        ) : !user ? (
                            <button
                                type="button"
                                onClick={handleStartCreatorSignup}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 transition-transform active:scale-[0.98]"
                            >
                                Start creator signup
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        ) : hasCreatorApplication ? (
                            <Link
                                href={CREATOR_WAITLIST_PATH}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20"
                            >
                                View your creator line status
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        ) : (
                            <Link
                                href="/dashboard/profile"
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white"
                            >
                                Open profile support options
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        )}

                        <Link
                            href="/faq"
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm font-semibold text-gray-200 transition-colors hover:border-brand-purple/30 hover:text-white"
                        >
                            What is a kandy drop?
                            <FileText className="h-4 w-4" />
                        </Link>
                    </div>

                    {user && !hasCreatorApplication && !loading ? (
                        <p className="mt-4 text-xs leading-6 text-amber-200">
                            You&apos;re already signed into a regular account. Creator signup is currently handled as a dedicated creator-intake flow, so use your support options if this account needs manual creator review instead.
                        </p>
                    ) : null}
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                    {CREATOR_STEPS.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <article key={step.title} className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-300">
                                        Step {index + 1}
                                    </span>
                                    <Icon className="h-5 w-5 text-brand-purple" />
                                </div>
                                <h2 className="mt-4 text-lg font-bold text-white">{step.title}</h2>
                                <p className="mt-2 text-sm leading-7 text-gray-400">{step.description}</p>
                            </article>
                        );
                    })}
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-sm">
                        <h2 className="flex items-center gap-2 text-base font-bold text-white">
                            <BadgeCheck className="h-5 w-5 text-brand-purple" />
                            Admin-ready review path
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-gray-400">
                            Creator applicants now land with durable review state so admins can track contracts, legal document delivery, ID verification, and manual segmenting before any creator-only tools are turned on.
                        </p>
                    </article>

                    <article className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-sm">
                        <h2 className="flex items-center gap-2 text-base font-bold text-white">
                            <ShieldCheck className="h-5 w-5 text-brand-purple" />
                            Separate from fan onboarding
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-gray-400">
                            The creator intake lane bypasses the regular user onboarding flow entirely, so creator applicants don&apos;t get pushed into fan setup screens while they&apos;re still awaiting review.
                        </p>
                    </article>
                </section>
            </div>
        </main>
    );
}
