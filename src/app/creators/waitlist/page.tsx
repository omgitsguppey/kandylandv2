"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, FileText, ShieldCheck, UserRoundSearch } from "lucide-react";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import {
    describeCreatorOnboardingBlockingReason,
    getCreatorOnboardingStatusSummary,
} from "@/lib/creator-onboarding";

function formatStatusLabel(value: string | undefined) {
    if (!value) {
        return "Waiting";
    }

    return value.replaceAll("_", " ");
}

function getPrimaryStatusLabel(value: NonNullable<ReturnType<typeof useAuth>["userProfile"]>["creatorApplication"] | undefined) {
    return getCreatorOnboardingStatusSummary(value).label;
}

export default function CreatorWaitlistPage() {
    const { user, userProfile, loading } = useAuth();
    const { openAuthModal } = useUI();
    const creatorApplication = userProfile?.creatorApplication;
    const [selectedIdFile, setSelectedIdFile] = useState<File | null>(null);
    const [uploadingId, setUploadingId] = useState(false);
    const canSubmitId = creatorApplication?.idVerificationStatus === "id_requested"
        || creatorApplication?.idVerificationStatus === "id_rejected";
    const blockingReasonDetails = (creatorApplication?.blockingReasons ?? [])
        .map((reason) => describeCreatorOnboardingBlockingReason(reason));
    const statusSummary = getCreatorOnboardingStatusSummary(creatorApplication);

    const handleIdUpload = async () => {
        if (!selectedIdFile) {
            toast.error("Choose an ID file before uploading.");
            return;
        }

        try {
            setUploadingId(true);
            const formData = new FormData();
            formData.set("file", selectedIdFile);
            const response = await authFetch("/api/creator/onboarding/id-submission", {
                method: "POST",
                body: formData,
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Failed to submit your ID.");
            }
            setSelectedIdFile(null);
            toast.success("ID submitted. Admin review will update this status once it is checked.");
        } catch (error) {
            console.error("Failed to submit creator ID", error);
            toast.error(error instanceof Error ? error.message : "Failed to submit your ID.");
        } finally {
            setUploadingId(false);
        }
    };

    return (
        <main className="min-h-screen bg-black px-4 pb-20 pt-28 text-white sm:px-6">
            <PageViewEvent
                eventName="creator_waitlist_viewed"
                eventParams={{ component_name: "creator_waitlist_page", creator_lane: "waitlist" }}
            />
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
                        Creator line
                    </span>

                    {loading ? (
                        <div className="mt-6 space-y-3">
                            <div className="h-6 w-40 animate-pulse rounded-full bg-white/10" />
                            <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
                            <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/10" />
                        </div>
                    ) : !user ? (
                        <div className="mt-6">
                            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Start your creator signup</h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
                                You need a creator application before we can place you in line. Start the 3-step creator signup and we&apos;ll hold your spot for review.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => openAuthModal("creator_signup")}
                                    className="rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20"
                                >
                                    Start creator signup
                                </button>
                                <Link
                                    href="/faq"
                                    className="rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm font-semibold text-gray-200"
                                >
                                    What is a kandy drop?
                                </Link>
                            </div>
                        </div>
                    ) : !creatorApplication ? (
                        <div className="mt-6">
                            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">No creator application found</h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
                                This account is signed in, but it is not currently in the creator intake line. If you need creator review from this account, use the support options from your profile or contact the team directly.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link
                                    href="/dashboard/profile"
                                    className="rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20"
                                >
                                    Open profile
                                </Link>
                                <Link
                                    href="/faq"
                                    className="rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm font-semibold text-gray-200"
                                >
                                    What is a kandy drop?
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                                You&apos;re in line for creator review
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
                                {statusSummary.summary}
                            </p>

                            <div className="mt-6 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                                <div className="rounded-[1.75rem] border border-brand-purple/20 bg-brand-purple/10 p-6">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">Place in line</p>
                                    <p className="mt-3 text-5xl font-black text-white">
                                        #{(creatorApplication.queuePosition || 0).toLocaleString()}
                                    </p>
                                    <p className="mt-3 text-sm leading-7 text-gray-200">
                                        Status: <span className="font-semibold capitalize text-white">{getPrimaryStatusLabel(creatorApplication)}</span>
                                    </p>
                                </div>

                                <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-6">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Application details</p>
                                    <div className="mt-4 space-y-3 text-sm text-gray-300">
                                        <p><span className="text-gray-500">Creator name:</span> {creatorApplication.creatorDisplayName}</p>
                                        <p><span className="text-gray-500">Primary platform:</span> {creatorApplication.creatorPrimaryPlatform || "Pending"}</p>
                                        <p><span className="text-gray-500">Manual segment:</span> {creatorApplication.segmentLabel || "Not assigned yet"}</p>
                                    </div>
                                    <div className="mt-5 flex flex-wrap gap-3">
                                        <Link
                                            href="/faq"
                                            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-brand-purple/30"
                                        >
                                            What is a kandy drop?
                                        </Link>
                                        {creatorApplication.legalDocumentUrl ? (
                                            <a
                                                href={creatorApplication.legalDocumentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-brand-purple/30"
                                            >
                                                Open legal document
                                            </a>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </section>

                {creatorApplication ? (
                    <section className="grid gap-4 md:grid-cols-3">
                        <article className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-base font-bold text-white">
                                <FileText className="h-5 w-5 text-brand-purple" />
                                Legal documents
                            </div>
                            <p className="mt-3 text-sm leading-7 text-gray-400">
                                {creatorApplication.legalStatus === "legal_pending"
                                    ? "No documents have been sent yet."
                                    : `Current status: ${formatStatusLabel(creatorApplication.legalStatus)}.`}
                            </p>
                        </article>

                        <article className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-base font-bold text-white">
                                <ShieldCheck className="h-5 w-5 text-brand-purple" />
                                ID verification
                            </div>
                            <p className="mt-3 text-sm leading-7 text-gray-400">
                                {creatorApplication.idVerificationStatus === "id_not_requested"
                                    ? "ID verification has not been requested yet."
                                    : `Current status: ${formatStatusLabel(creatorApplication.idVerificationStatus)}.`}
                            </p>
                            {creatorApplication.idDocument ? (
                                <p className="mt-3 text-xs leading-6 text-emerald-200">
                                    Latest file: {creatorApplication.idDocument.fileName}
                                </p>
                            ) : null}
                        </article>

                        <article className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-base font-bold text-white">
                                <UserRoundSearch className="h-5 w-5 text-brand-purple" />
                                Manual segmenting
                            </div>
                            <p className="mt-3 text-sm leading-7 text-gray-400">
                                {creatorApplication.segmentationStatus === "segment_unassigned"
                                    ? "Your creator segment has not been assigned yet."
                                    : `Current status: ${formatStatusLabel(creatorApplication.segmentationStatus)}.`}
                            </p>
                        </article>
                    </section>
                ) : null}

                {creatorApplication ? (
                    <section className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-base font-bold text-white">What still needs attention</h2>
                                <p className="mt-2 text-sm leading-7 text-gray-400">
                                    This screen now reflects the real backend blockers for your creator approval instead of a generic waiting state.
                                </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                {blockingReasonDetails.length} blockers
                            </span>
                        </div>

                        <div className="mt-4 space-y-3">
                            {blockingReasonDetails.length === 0 ? (
                                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                                    No blockers are currently recorded on your application. The next admin review can approve it when the queue reaches your spot.
                                </div>
                            ) : (
                                blockingReasonDetails.map((blockingReason) => (
                                    <div key={blockingReason.reason} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                                        <p className="text-sm font-semibold text-white">{blockingReason.label}</p>
                                        <p className="mt-1 text-sm leading-6 text-gray-400">{blockingReason.description}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                ) : null}

                {creatorApplication && canSubmitId ? (
                    <section className="rounded-[1.75rem] border border-brand-purple/20 bg-brand-purple/10 p-5 backdrop-blur-sm">
                        <h2 className="flex items-center gap-2 text-base font-bold text-white">
                            <ShieldCheck className="h-5 w-5 text-brand-purple" />
                            Submit your ID
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-gray-300">
                            Upload a clear JPG, PNG, WebP, or PDF so admin can verify your creator identity. This only appears once ID review is actually requested for your account.
                        </p>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <label className="flex-1">
                                <span className="sr-only">Choose an ID file</span>
                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                                    onChange={(event) => setSelectedIdFile(event.target.files?.[0] ?? null)}
                                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none file:mr-3 file:rounded-full file:border-0 file:bg-brand-purple file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => void handleIdUpload()}
                                disabled={uploadingId}
                                className="rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 disabled:opacity-50"
                            >
                                {uploadingId ? "Submitting..." : "Submit ID"}
                            </button>
                        </div>
                        {selectedIdFile ? (
                            <p className="mt-3 text-xs text-gray-400">
                                Selected file: {selectedIdFile.name}
                            </p>
                        ) : null}
                    </section>
                ) : null}

                <section className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-sm">
                    <h2 className="flex items-center gap-2 text-base font-bold text-white">
                        <BadgeCheck className="h-5 w-5 text-brand-purple" />
                        Why this is separate from fan onboarding
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-gray-400">
                        Creator applications stay in a protected intake lane so admins can verify identity, manage legal requirements, and manually segment each account before any regular user onboarding steps or creator tools are shown.
                    </p>
                </section>
            </div>
        </main>
    );
}
