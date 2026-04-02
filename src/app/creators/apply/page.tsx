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
        title: "Tell us who you create as",
        description: "Add your creator name, main platform, and content focus so the review team knows how to route your application.",
        icon: Sparkles,
    },
    {
        title: "Confirm your account details",
        description: "Pick your handle and confirm the account details needed before your review can begin.",
        icon: Users,
    },
    {
        title: "Join the review line",
        description: "Finish signup and we’ll save your place while legal, ID review, and creator setup are completed.",
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
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
                    <div className="max-w-2xl">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
                            Creator application
                        </span>
                        <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                            Apply for creator access
                        </h1>
                        <p className="mt-4 max-w-xl text-sm leading-7 text-gray-300 sm:text-base">
                            Creator applications go through a separate review lane so we can verify your account, send legal paperwork, and request your ID when it&apos;s time. Nothing is turned on until that review is complete.
                        </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">Manual review</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">Legal docs</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">ID verification</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">Manual segmenting</span>
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
                                Start creator application
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        ) : hasCreatorApplication ? (
                            <Link
                                href={CREATOR_WAITLIST_PATH}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20"
                            >
                                Check application status
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        ) : (
                            <Link
                                href="/dashboard/profile"
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white"
                            >
                                Open creator help
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        )}

                        <Link
                            href="/faq"
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm font-semibold text-gray-200 transition-colors hover:border-brand-purple/30 hover:text-white"
                        >
                            Learn about KandyDrops
                            <FileText className="h-4 w-4" />
                        </Link>
                    </div>

                    {user && !hasCreatorApplication && !loading ? (
                        <p className="mt-4 rounded-[1.25rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs leading-6 text-amber-100">
                            You&apos;re already signed into a regular account. If you want this account reviewed for creator access, start a creator application from the signup flow or use your profile support options for help.
                        </p>
                    ) : null}
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                    {CREATOR_STEPS.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <article key={step.title} className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-300">
                                        Step {index + 1}
                                    </span>
                                    <Icon className="h-5 w-5 text-brand-purple" />
                                </div>
                                <h2 className="mt-3 text-base font-bold text-white">{step.title}</h2>
                                <p className="mt-2 text-sm leading-6 text-gray-400">{step.description}</p>
                            </article>
                        );
                    })}
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                        <h2 className="flex items-center gap-2 text-base font-bold text-white">
                            <BadgeCheck className="h-5 w-5 text-brand-purple" />
                            What happens after you apply
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-gray-400">
                            After you submit, your application stays visible to the review team with clear legal, ID, and approval checkpoints. You&apos;ll see the same real status updates on your waiting page.
                        </p>
                    </article>

                    <article className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                        <h2 className="flex items-center gap-2 text-base font-bold text-white">
                            <ShieldCheck className="h-5 w-5 text-brand-purple" />
                            What you&apos;ll need later
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-gray-400">
                            Be ready to review legal paperwork and upload the front and back of a government-issued photo ID once the review team requests it.
                        </p>
                    </article>
                </section>
            </div>
        </main>
    );
}
