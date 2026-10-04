"use client";

import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { CreatorApplicationLanding } from "@/components/creative-tim/kandydrops/creator/CreatorApplicationLanding";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { CREATOR_WAITLIST_PATH } from "@/lib/creator-application";
import { trackEvent } from "@/lib/telemetry";

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
        <main className="min-h-screen bg-[#08050d] pb-20 pt-24 text-white sm:pt-28">
            <PageViewEvent
                eventName="creator_apply_viewed"
                eventParams={{ component_name: "creator_apply_page", creator_lane: "intake" }}
            />
            <CreatorApplicationLanding
                primaryAction={loading ? (
                    <span className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-300">
                        Checking your account...
                    </span>
                ) : !user ? (
                    <button
                        type="button"
                        onClick={handleStartCreatorSignup}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-purple px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/25 transition-transform active:scale-[0.98]"
                    >
                        Start creator application
                        <ArrowRight className="h-4 w-4" />
                    </button>
                ) : hasCreatorApplication ? (
                    <Link
                        href={CREATOR_WAITLIST_PATH}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-purple px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/25"
                    >
                        Check application status
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                ) : (
                    <Link
                        href="/dashboard/support?category=creator_application&subject=Creator%20application%20support"
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white"
                    >
                        Open creator support
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                )}
                secondaryAction={(
                    <Link
                        href="/faq"
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-5 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-brand-purple/30 hover:text-white"
                    >
                        Learn about KandyDrops
                        <FileText className="h-4 w-4" />
                    </Link>
                )}
                accountNotice={user && !hasCreatorApplication && !loading ? (
                    <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
                        This account is still a regular user account, so use creator support if it should already be in review.
                    </p>
                ) : null}
            />
        </main>
    );
}
