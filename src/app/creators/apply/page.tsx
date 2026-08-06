"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, FileText, ShieldCheck, Sparkles, Users } from "lucide-react";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { CreatorPublicProfileFrame } from "@/components/Creators/CreatorPublicProfileFrame";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { CREATOR_WAITLIST_PATH } from "@/lib/creator-application";
import { trackEvent } from "@/lib/telemetry";

const CREATOR_STEPS = [
    {
        title: "Tell us who you create as",
        description: "Add your creator name, main platform, and content focus.",
        icon: Sparkles,
    },
    {
        title: "Confirm your account details",
        description: "Confirm the account details tied to this review.",
        icon: Users,
    },
    {
        title: "Enter manual review",
        description: "Finish signup, then complete intro, ID, and agreement steps from the waiting page.",
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
        <main className="min-h-screen bg-[#08060d] pb-20 pt-28 text-white">
            <PageViewEvent
                eventName="creator_apply_viewed"
                eventParams={{ component_name: "creator_apply_page", creator_lane: "intake" }}
            />
            <CreatorPublicProfileFrame contentClassName="max-w-5xl pt-0 sm:pt-0">
                <div className="flex w-full flex-col gap-5">
                <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.1] via-[#171022]/95 to-[#08060d] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">
                    <div className="max-w-2xl">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
                            Creator application
                        </span>
                        <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                            Apply for creator access
                        </h1>
                        <p className="mt-4 max-w-xl text-sm leading-6 text-gray-300 sm:text-base">
                            Apply once, then track the real review, legal, and ID steps here until approval.
                        </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">Manual review</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">5 to 7 business days</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">Legal docs</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">ID verification</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">Stage-based status</span>
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
                                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 transition-transform active:scale-[0.98]"
                            >
                                Start creator application
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        ) : hasCreatorApplication ? (
                            <Link
                                href={CREATOR_WAITLIST_PATH}
                                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20"
                            >
                                Check application status
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        ) : (
                            <Link
                                href="/dashboard/support?category=creator_application&subject=Creator%20application%20support"
                                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white"
                            >
                                Open creator support
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        )}

                        <Link
                            href="/faq"
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm font-semibold text-gray-200 transition-colors hover:border-brand-purple/30 hover:text-white"
                        >
                            Learn about KandyDrops
                            <FileText className="h-4 w-4" />
                        </Link>
                    </div>

                    {user && !hasCreatorApplication && !loading ? (
                        <p className="mt-4 rounded-[1.25rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs leading-5 text-amber-100">
                            This account is still a regular user account, so use creator support if it should already be in review.
                        </p>
                    ) : null}
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                    {CREATOR_STEPS.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <article key={step.title} className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-300">
                                        Step {index + 1}
                                    </span>
                                    <Icon className="h-5 w-5 text-brand-purple" />
                                </div>
                                <h2 className="mt-3 text-base font-bold text-white">{step.title}</h2>
                                <p className="mt-2 text-sm leading-5 text-gray-400">{step.description}</p>
                            </article>
                        );
                    })}
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                        <h2 className="flex items-center gap-2 text-base font-bold text-white">
                            <BadgeCheck className="h-5 w-5 text-brand-purple" />
                            What happens next
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-gray-400">
                            Your waiting page shows the same legal, ID, and approval checkpoints the review team sees.
                        </p>
                    </article>

                    <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                        <h2 className="flex items-center gap-2 text-base font-bold text-white">
                            <ShieldCheck className="h-5 w-5 text-brand-purple" />
                            What you&apos;ll need
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-gray-400">
                            Be ready for the creator intro, the full verification package, and the in-app agreement when those steps unlock.
                        </p>
                    </article>
                </section>
                </div>
            </CreatorPublicProfileFrame>
        </main>
    );
}
