"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CheckCircle2, FileText, ShieldCheck, UploadCloud, UserRoundSearch } from "lucide-react";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import {
    describeCreatorOnboardingBlockingReason,
    getCreatorOnboardingIdDocumentBySide,
    getCreatorOnboardingIdDocumentSummary,
    getCreatorOnboardingStatusSummary,
} from "@/lib/creator-onboarding";

type CreatorApplicationState = NonNullable<NonNullable<ReturnType<typeof useAuth>["userProfile"]>["creatorApplication"]>;
type IdUploadSide = "front" | "back";

const ID_UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";
const ID_UPLOAD_REQUIREMENTS = [
    "Front of a government-issued photo ID",
    "Back of the same ID",
    "JPG, PNG, WebP, or PDF up to 15MB",
    "If your ID only has one side, upload the same file in both slots",
] as const;

const ID_UPLOAD_SIDES: Array<{
    side: IdUploadSide;
    title: string;
    description: string;
}> = [
    {
        side: "front",
        title: "Front of ID",
        description: "Photo, full name, and document number should be easy to read.",
    },
    {
        side: "back",
        title: "Back of ID",
        description: "Upload the reverse side so the review team can verify the full document.",
    },
];

function formatStatusLabel(value: string | undefined) {
    if (!value) {
        return "Waiting";
    }

    return value.replaceAll("_", " ");
}

function getPrimaryStatusLabel(value: CreatorApplicationState | undefined) {
    return getCreatorOnboardingStatusSummary(value).label;
}

function buildUploadButtonLabel(frontSelected: boolean, backSelected: boolean) {
    if (frontSelected && backSelected) {
        return "Upload both files";
    }

    if (frontSelected) {
        return "Upload front of ID";
    }

    if (backSelected) {
        return "Upload back of ID";
    }

    return "Choose files to upload";
}

export default function CreatorWaitlistPage() {
    const { user, userProfile, loading } = useAuth();
    const { openAuthModal } = useUI();
    const [creatorApplicationState, setCreatorApplicationState] = useState<CreatorApplicationState | null>(userProfile?.creatorApplication ?? null);
    const [selectedIdFiles, setSelectedIdFiles] = useState<Record<IdUploadSide, File | null>>({
        front: null,
        back: null,
    });
    const [uploadingId, setUploadingId] = useState(false);

    useEffect(() => {
        setCreatorApplicationState(userProfile?.creatorApplication ?? null);
    }, [userProfile?.creatorApplication]);

    const creatorApplication = creatorApplicationState ?? userProfile?.creatorApplication ?? null;
    const canSubmitId = creatorApplication?.idVerificationStatus === "id_requested"
        || creatorApplication?.idVerificationStatus === "id_rejected";
    const blockingReasonDetails = (creatorApplication?.blockingReasons ?? [])
        .map((reason) => describeCreatorOnboardingBlockingReason(reason));
    const statusSummary = getCreatorOnboardingStatusSummary(creatorApplication);
    const idSummary = getCreatorOnboardingIdDocumentSummary(creatorApplication);
    const hasSelectedFiles = Boolean(selectedIdFiles.front || selectedIdFiles.back);
    const uploadButtonLabel = buildUploadButtonLabel(Boolean(selectedIdFiles.front), Boolean(selectedIdFiles.back));

    const uploadCards = useMemo(() => ID_UPLOAD_SIDES.map((config) => {
        const uploadedDocument = getCreatorOnboardingIdDocumentBySide(creatorApplication, config.side);
        return {
            ...config,
            uploadedDocument,
            selectedFile: selectedIdFiles[config.side],
        };
    }), [creatorApplication, selectedIdFiles]);

    const handleSelectIdFile = (side: IdUploadSide, file: File | null) => {
        setSelectedIdFiles((current) => ({
            ...current,
            [side]: file,
        }));
    };

    const handleIdUpload = async () => {
        const pendingUploads = (Object.entries(selectedIdFiles) as Array<[IdUploadSide, File | null]>)
            .filter((entry): entry is [IdUploadSide, File] => Boolean(entry[1]));

        if (pendingUploads.length === 0) {
            toast.error("Choose the front, back, or both ID files before uploading.");
            return;
        }

        try {
            setUploadingId(true);
            let nextCreatorApplication = creatorApplication;

            for (const [side, file] of pendingUploads) {
                const formData = new FormData();
                formData.set("slot", side);
                formData.set("file", file);

                const response = await authFetch("/api/creator/onboarding/id-submission", {
                    method: "POST",
                    body: formData,
                });
                const result = await response.json().catch(() => ({})) as {
                    error?: string;
                    creatorApplication?: CreatorApplicationState;
                    documentsComplete?: boolean;
                };

                if (!response.ok) {
                    throw new Error(result.error || "Failed to submit your ID files.");
                }

                if (result.creatorApplication) {
                    nextCreatorApplication = result.creatorApplication;
                    setCreatorApplicationState(result.creatorApplication);
                }
            }

            setSelectedIdFiles({
                front: null,
                back: null,
            });

            const nextSummary = getCreatorOnboardingIdDocumentSummary(nextCreatorApplication);
            toast.success(nextSummary.complete
                ? "Both ID files are in. The review team can now verify your identity."
                : "ID file uploaded. Add the remaining side when you’re ready.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to submit your ID files.");
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
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
                <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">
                        Creator application
                    </span>

                    {loading ? (
                        <div className="mt-6 space-y-3">
                            <div className="h-6 w-40 animate-pulse rounded-full bg-white/10" />
                            <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
                            <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/10" />
                        </div>
                    ) : !user ? (
                        <div className="mt-6">
                            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Start your creator application</h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
                                Create your creator application first, then we&apos;ll hold your spot in the review line and show every next step here.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => openAuthModal("creator_signup")}
                                    className="rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20"
                                >
                                    Start creator application
                                </button>
                                <Link
                                    href="/faq"
                                    className="rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm font-semibold text-gray-200"
                                >
                                    Learn about KandyDrops
                                </Link>
                            </div>
                        </div>
                    ) : !creatorApplication ? (
                        <div className="mt-6">
                            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">No creator application found</h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
                                You&apos;re signed in, but this account does not have an active creator application yet. Start a new application or open your profile if you need help with this account.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => openAuthModal("creator_signup")}
                                    className="rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20"
                                >
                                    Start creator application
                                </button>
                                <Link
                                    href="/dashboard/profile"
                                    className="rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm font-semibold text-gray-200"
                                >
                                    Open profile
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                                Your creator application is in review
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
                                {statusSummary.summary}
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">
                                    Status: {getPrimaryStatusLabel(creatorApplication)}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">
                                    Legal {formatStatusLabel(creatorApplication.legalStatus)}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">
                                    ID {formatStatusLabel(creatorApplication.idVerificationStatus)}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">
                                    Segment {creatorApplication.segmentLabel || formatStatusLabel(creatorApplication.segmentationStatus)}
                                </span>
                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
                                <div className="rounded-[1.75rem] border border-brand-purple/20 bg-brand-purple/10 p-5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">Place in line</p>
                                    <p className="mt-3 text-4xl font-black text-white sm:text-5xl">
                                        #{(creatorApplication.queuePosition || 0).toLocaleString()}
                                    </p>
                                    <p className="mt-3 text-sm leading-6 text-gray-200">
                                        Your review spot is saved. We&apos;ll update this page as legal, ID review, and creator setup move forward.
                                    </p>
                                </div>

                                <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Application details</p>
                                    <div className="mt-4 space-y-3 text-sm text-gray-300">
                                        <p><span className="text-gray-500">Creator name:</span> {creatorApplication.creatorDisplayName}</p>
                                        <p><span className="text-gray-500">Primary platform:</span> {creatorApplication.creatorPrimaryPlatform || "Not added yet"}</p>
                                        <p><span className="text-gray-500">Segment:</span> {creatorApplication.segmentLabel || "Assigned during review"}</p>
                                        <p><span className="text-gray-500">ID files received:</span> {idSummary.count}/2</p>
                                    </div>
                                    <div className="mt-5 flex flex-wrap gap-3">
                                        <Link
                                            href="/faq"
                                            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-brand-purple/30"
                                        >
                                            Learn about KandyDrops
                                        </Link>
                                        {creatorApplication.legalDocumentUrl ? (
                                            <a
                                                href={creatorApplication.legalDocumentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-brand-purple/30"
                                            >
                                                Review legal document
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
                        <article className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-base font-bold text-white">
                                <FileText className="h-5 w-5 text-brand-purple" />
                                Legal documents
                            </div>
                            <p className="mt-3 text-sm leading-7 text-gray-400">
                                {creatorApplication.legalStatus === "legal_pending"
                                    ? "Your agreement will appear here as soon as it is ready to review."
                                    : creatorApplication.legalStatus === "legal_sent"
                                        ? "Your agreement is ready. Open it from this page and complete any signature steps."
                                        : "Your legal step is complete."}
                            </p>
                        </article>

                        <article className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-base font-bold text-white">
                                <ShieldCheck className="h-5 w-5 text-brand-purple" />
                                ID verification
                            </div>
                            <p className="mt-3 text-sm leading-7 text-gray-400">
                                {creatorApplication.idVerificationStatus === "id_not_requested"
                                    ? "Wait for the review team to request your ID. The upload section will unlock here."
                                    : creatorApplication.idVerificationStatus === "id_submitted"
                                        ? "Your ID files are in review."
                                        : `Files received: ${idSummary.count}/2. Upload any missing side from this page.`}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <span className={`rounded-full border px-2.5 py-1 ${idSummary.front ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-gray-400"}`}>
                                    Front {idSummary.front ? "uploaded" : "needed"}
                                </span>
                                <span className={`rounded-full border px-2.5 py-1 ${idSummary.back ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-gray-400"}`}>
                                    Back {idSummary.back ? "uploaded" : "needed"}
                                </span>
                            </div>
                        </article>

                        <article className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-base font-bold text-white">
                                <UserRoundSearch className="h-5 w-5 text-brand-purple" />
                                Final review
                            </div>
                            <p className="mt-3 text-sm leading-7 text-gray-400">
                                The review team assigns your creator segment and final approval here. When something needs your attention, this page will show it clearly.
                            </p>
                        </article>
                    </section>
                ) : null}

                {creatorApplication ? (
                    <section className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-base font-bold text-white">Your next steps</h2>
                                <p className="mt-2 text-sm leading-7 text-gray-400">
                                    Complete any items below and keep checking this page for status updates.
                                </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                {blockingReasonDetails.length} blockers
                            </span>
                        </div>

                        <div className="mt-4 space-y-3">
                            {blockingReasonDetails.length === 0 ? (
                                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                                    You&apos;re caught up. The review team can approve your creator access as soon as they reach your application.
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
                    <section className="rounded-[1.75rem] border border-brand-purple/20 bg-brand-purple/10 p-4 backdrop-blur-sm">
                        <h2 className="flex items-center gap-2 text-base font-bold text-white">
                            <UploadCloud className="h-5 w-5 text-brand-purple" />
                            Upload your ID documents
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-gray-300">
                            Upload the front and back of the same government-issued photo ID. We&apos;ll mark your ID ready for review once both files are in.
                        </p>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {ID_UPLOAD_REQUIREMENTS.map((requirement) => (
                                <div key={requirement} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-gray-200">
                                    {requirement}
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {uploadCards.map((card) => (
                                <div key={card.side} className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-white">{card.title}</p>
                                            <p className="mt-1 text-xs leading-6 text-gray-400">{card.description}</p>
                                        </div>
                                        {card.uploadedDocument ? (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                Uploaded
                                            </span>
                                        ) : (
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                                                Needed
                                            </span>
                                        )}
                                    </div>

                                    <label className="mt-4 block">
                                        <span className="sr-only">{card.title}</span>
                                        <input
                                            type="file"
                                            accept={ID_UPLOAD_ACCEPT}
                                            onChange={(event) => handleSelectIdFile(card.side, event.target.files?.[0] ?? null)}
                                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none file:mr-3 file:rounded-full file:border-0 file:bg-brand-purple file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                                        />
                                    </label>

                                    {card.selectedFile ? (
                                        <p className="mt-3 text-xs text-gray-300">Ready to upload: {card.selectedFile.name}</p>
                                    ) : card.uploadedDocument ? (
                                        <p className="mt-3 text-xs text-emerald-200">Current file: {card.uploadedDocument.fileName}</p>
                                    ) : (
                                        <p className="mt-3 text-xs text-gray-500">No file selected yet.</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs leading-6 text-gray-300">
                                {idSummary.count === 0
                                    ? "No ID files have been received yet."
                                    : idSummary.complete
                                        ? "Both sides are uploaded and ready for review."
                                        : "One side is in. Upload the remaining file to finish this step."}
                            </p>
                            <button
                                type="button"
                                onClick={() => void handleIdUpload()}
                                disabled={uploadingId || !hasSelectedFiles}
                                className="rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 disabled:opacity-50"
                            >
                                {uploadingId ? "Uploading..." : uploadButtonLabel}
                            </button>
                        </div>
                    </section>
                ) : null}

                {creatorApplication ? (
                    <section className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                        <h2 className="flex items-center gap-2 text-base font-bold text-white">
                            <BadgeCheck className="h-5 w-5 text-brand-purple" />
                            What happens next
                        </h2>
                        <div className="mt-3 space-y-3 text-sm leading-7 text-gray-400">
                            <p>1. We keep your place in line while contracts, identity review, and creator setup move through the queue.</p>
                            <p>2. If the review team needs something from you, this page updates with the exact next step.</p>
                            <p>3. Once everything is approved, your creator access will turn on and you&apos;ll leave this holding page automatically.</p>
                        </div>
                    </section>
                ) : null}
            </div>
        </main>
    );
}
