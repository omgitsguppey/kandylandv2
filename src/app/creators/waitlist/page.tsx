"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    BadgeCheck,
    CheckCircle2,
    FileText,
    LifeBuoy,
    PencilLine,
    ShieldCheck,
    UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import {
    canEditCreatorApplicantIntake,
    CREATOR_LEGAL_WAITING_HEADLINE,
    CREATOR_LEGAL_WAITING_HELPER,
    CREATOR_REVIEW_TIMELINE_COPY,
    describeCreatorFacingOnboardingBlockingReason,
    getCreatorOnboardingIdDocumentBySide,
    getCreatorOnboardingIdDocumentSummary,
    getCreatorOnboardingStatusSummary,
    KREATOR_EXPERIENCES_DEFINITION,
} from "@/lib/creator-onboarding";
import { PRIVACY_SUPPORT_EMAIL } from "@/lib/privacy-policy";

type CreatorApplicationState = NonNullable<NonNullable<ReturnType<typeof useAuth>["userProfile"]>["creatorApplication"]>;
type IdUploadSide = "front" | "back";
type EditableApplicationDraft = {
    creatorDisplayName: string;
    creatorPrimaryPlatform: string;
    creatorContentFocus: string;
};

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

const APPROVED_ACCESS_ITEMS = [
    "Creator dashboard access",
    "Drop creation tools",
    "Direct fan messaging where enabled",
    "Bookings and experiences where enabled",
    "Payout request tools where enabled",
    "Creator profile and public creator surfaces where enabled",
] as const;

function formatStatusLabel(value: string | undefined) {
    if (!value) {
        return "Waiting";
    }

    return value.replaceAll("_", " ");
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

function buildCreatorSupportHref(input: {
    userId?: string | null;
    username?: string | null;
    creatorDisplayName?: string | null;
    stage: string;
}) {
    const subject = encodeURIComponent("Creator application support");
    const body = encodeURIComponent([
        "Hi KandyDrops creator support,",
        "",
        "I need help with my creator application.",
        `Current stage: ${input.stage}`,
        input.creatorDisplayName ? `Creator name: ${input.creatorDisplayName}` : null,
        input.username ? `Username: @${input.username}` : null,
        input.userId ? `User ID: ${input.userId}` : null,
        "",
        "Please review my application and let me know what needs attention.",
    ].filter(Boolean).join("\n"));

    return `mailto:${PRIVACY_SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

function buildDefaultEditableDraft(value: CreatorApplicationState | null | undefined): EditableApplicationDraft {
    return {
        creatorDisplayName: value?.creatorDisplayName || "",
        creatorPrimaryPlatform: value?.creatorPrimaryPlatform || "",
        creatorContentFocus: value?.creatorContentFocus || "",
    };
}

function getIdVerificationPresentation(value: CreatorApplicationState | null, count: number, complete: boolean) {
    if (!value) {
        return {
            label: "Pending",
            description: "ID verification is required for every creator application.",
        };
    }

    if (value.idVerificationStatus === "id_verified") {
        return {
            label: "Accepted",
            description: "Your ID has been accepted and this intake step is complete.",
        };
    }

    if (value.idVerificationStatus === "id_submitted") {
        return {
            label: "Submitted",
            description: "Your ID files are in and waiting for manual review.",
        };
    }

    if (value.idVerificationStatus === "id_rejected") {
        return {
            label: "Blocked",
            description: "Your last ID submission needs a replacement. Upload fresh files from this page so review can continue.",
        };
    }

    if (count === 0) {
        return {
            label: "Missing",
            description: "ID verification is required for every creator application. Upload the front and back of your ID from this page when the secure upload step is available.",
        };
    }

    if (!complete) {
        return {
            label: "Pending",
            description: "One ID file is already in. Upload the remaining side from this page so identity review can continue.",
        };
    }

    return {
        label: "Pending",
        description: "Your ID verification step is still waiting for the next review update.",
    };
}

export default function CreatorWaitlistPage() {
    const { user, userProfile, loading } = useAuth();
    const { openAuthModal } = useUI();
    const [creatorApplicationState, setCreatorApplicationState] = useState<CreatorApplicationState | null>(userProfile?.creatorApplication ?? null);
    const [selectedIdFiles, setSelectedIdFiles] = useState<Record<IdUploadSide, File | null>>({
        front: null,
        back: null,
    });
    const [editableDraft, setEditableDraft] = useState<EditableApplicationDraft>(buildDefaultEditableDraft(userProfile?.creatorApplication));
    const [uploadingId, setUploadingId] = useState(false);
    const [savingApplication, setSavingApplication] = useState(false);

    useEffect(() => {
        const nextApplication = userProfile?.creatorApplication ?? null;
        setCreatorApplicationState(nextApplication);
        setEditableDraft(buildDefaultEditableDraft(nextApplication));
    }, [userProfile?.creatorApplication]);

    const creatorApplication = creatorApplicationState ?? userProfile?.creatorApplication ?? null;
    const canSubmitId = creatorApplication?.idVerificationStatus === "id_requested"
        || creatorApplication?.idVerificationStatus === "id_rejected";
    const canEditApplication = canEditCreatorApplicantIntake({
        approvalStatus: creatorApplication?.approvalStatus ?? "creator_pending",
        role: userProfile?.role ?? "user",
    });
    const blockingReasonDetails = (creatorApplication?.blockingReasons ?? [])
        .map((reason) => describeCreatorFacingOnboardingBlockingReason(reason));
    const statusSummary = getCreatorOnboardingStatusSummary(creatorApplication);
    const idSummary = getCreatorOnboardingIdDocumentSummary(creatorApplication);
    const idPresentation = getIdVerificationPresentation(creatorApplication, idSummary.count, idSummary.complete);
    const hasSelectedFiles = Boolean(selectedIdFiles.front || selectedIdFiles.back);
    const uploadButtonLabel = buildUploadButtonLabel(Boolean(selectedIdFiles.front), Boolean(selectedIdFiles.back));
    const creatorSupportHref = buildCreatorSupportHref({
        userId: user?.uid ?? null,
        username: userProfile?.username ?? null,
        creatorDisplayName: creatorApplication?.creatorDisplayName ?? null,
        stage: statusSummary.stage,
    });

    const uploadCards = useMemo(() => ID_UPLOAD_SIDES.map((config) => {
        const uploadedDocument = getCreatorOnboardingIdDocumentBySide(creatorApplication, config.side);
        return {
            ...config,
            uploadedDocument,
            selectedFile: selectedIdFiles[config.side],
        };
    }), [creatorApplication, selectedIdFiles]);

    const legalDocumentReady = creatorApplication?.legalStatus === "legal_sent" && Boolean(creatorApplication.legalDocumentUrl);
    const currentAction = creatorApplication
        ? statusSummary.stage === "Approved"
            ? {
                title: "Open your creator tools",
                description: "Approval is complete. Use your creator dashboard and standard creator management pages for profile updates, drops, messaging, bookings, and payouts where they are enabled.",
            }
            : canSubmitId
                ? {
                    title: "Upload your ID documents",
                    description: idSummary.count === 1
                        ? "One side is already in. Upload the remaining file so identity review can continue."
                        : "Your next step is to upload the front and back of your ID from this page.",
                }
                : legalDocumentReady
                    ? {
                        title: "Review your legal document",
                        description: "Open the agreement from this page and complete any required signature steps when you are ready.",
                    }
                    : statusSummary.stage === "Needs attention"
                        ? {
                            title: "Contact creator support",
                            description: "This application needs follow-up. Use the creator support action on this page if anything looks incomplete or contradictory.",
                        }
                        : {
                            title: "Wait for review updates",
                            description: "You are caught up right now. This page will only change when the review team needs something from you or when approval is complete.",
                        }
        : null;

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
                : "ID file uploaded. Add the remaining side when you are ready.");
        } catch (error) {
            reportClientIssue({
                channel: "auth",
                severity: "error",
                message: "Creator ID upload failed on the waiting page",
                error,
                detail: {
                    action: "upload_creator_id",
                    userId: user?.uid ?? null,
                },
                consoleLabel: "[Creator Waitlist] ID upload failed",
            });
            toast.error(error instanceof Error ? error.message : "Failed to submit your ID files.");
        } finally {
            setUploadingId(false);
        }
    };

    const handleApplicationSave = async () => {
        const creatorDisplayName = editableDraft.creatorDisplayName.trim();
        const creatorPrimaryPlatform = editableDraft.creatorPrimaryPlatform.trim();
        const creatorContentFocus = editableDraft.creatorContentFocus.trim();

        if (creatorDisplayName.length < 2 || creatorPrimaryPlatform.length < 2 || creatorContentFocus.length < 8) {
            toast.error("Add a creator name, main platform, and content summary before saving.");
            return;
        }

        try {
            setSavingApplication(true);
            const response = await authFetch("/api/creator/onboarding/application", {
                method: "PUT",
                body: JSON.stringify({
                    creatorDisplayName,
                    creatorPrimaryPlatform,
                    creatorContentFocus,
                }),
            });
            const result = await response.json().catch(() => ({})) as {
                error?: string;
                creatorApplication?: CreatorApplicationState;
            };

            if (!response.ok || !result.creatorApplication) {
                throw new Error(result.error || "Failed to save your creator application.");
            }

            setCreatorApplicationState(result.creatorApplication);
            setEditableDraft(buildDefaultEditableDraft(result.creatorApplication));
            toast.success("Creator application updated.");
        } catch (error) {
            reportClientIssue({
                channel: "auth",
                severity: "error",
                message: "Creator application edit failed on the waiting page",
                error,
                detail: {
                    action: "update_creator_application",
                    userId: user?.uid ?? null,
                },
                consoleLabel: "[Creator Waitlist] application update failed",
            });
            toast.error(error instanceof Error ? error.message : "Failed to save your creator application.");
        } finally {
            setSavingApplication(false);
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
                        Kreator Experiences
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
                                {KREATOR_EXPERIENCES_DEFINITION} {CREATOR_REVIEW_TIMELINE_COPY}
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
                                You are signed in, but this account does not have an active creator application yet. Start a new creator application or use creator support if this account should already be in review.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link
                                    href="/dashboard/profile"
                                    className="rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20"
                                >
                                    Open profile support
                                </Link>
                                <a
                                    href={creatorSupportHref}
                                    className="rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm font-semibold text-gray-200"
                                >
                                    Contact creator support
                                </a>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                                Creator application status
                            </h1>
                            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 sm:text-base">
                                {KREATOR_EXPERIENCES_DEFINITION}
                            </p>
                            <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-300 sm:text-base">
                                {statusSummary.summary}
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">
                                    Stage: {statusSummary.stage}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">
                                    Timeline: {CREATOR_REVIEW_TIMELINE_COPY}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">
                                    Legal {formatStatusLabel(creatorApplication.legalStatus)}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">
                                    ID {idPresentation.label}
                                </span>
                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                                <div className="rounded-[1.75rem] border border-brand-purple/20 bg-brand-purple/10 p-5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">What to do now</p>
                                    <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                                        {currentAction?.title}
                                    </h2>
                                    <p className="mt-3 text-sm leading-6 text-gray-200">
                                        {currentAction?.description}
                                    </p>
                                    <div className="mt-5 flex flex-wrap gap-3">
                                        {statusSummary.stage === "Approved" ? (
                                            <Link
                                                href="/dashboard/profile"
                                                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-gray-100"
                                            >
                                                Open creator dashboard
                                            </Link>
                                        ) : null}
                                        {legalDocumentReady && creatorApplication.legalDocumentUrl ? (
                                            <a
                                                href={creatorApplication.legalDocumentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-gray-100"
                                            >
                                                Open legal document
                                            </a>
                                        ) : null}
                                        {canSubmitId ? (
                                            <a
                                                href="#creator-id-upload"
                                                className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white/20"
                                            >
                                                Go to ID upload
                                            </a>
                                        ) : null}
                                        {canEditApplication ? (
                                            <a
                                                href="#creator-application-edit"
                                                className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white/20"
                                            >
                                                Revise application
                                            </a>
                                        ) : null}
                                        <a
                                            href={creatorSupportHref}
                                            className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white/20"
                                        >
                                            Contact creator support
                                        </a>
                                    </div>
                                </div>

                                <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Review facts</p>
                                    <div className="mt-4 space-y-3 text-sm leading-6 text-gray-300">
                                        <p>Manual admin approval is the only way creator access turns on.</p>
                                        <p>No queue number is used on this page. Status is stage-based only.</p>
                                        <p>Legal and ID steps only appear here when backend review actually requires them.</p>
                                        <p>Until approval is complete, this page is your single source of truth for creator intake updates.</p>
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
                                Legal
                            </div>
                            <p className="mt-3 text-sm font-semibold text-white">
                                {creatorApplication.legalStatus === "legal_pending"
                                    ? CREATOR_LEGAL_WAITING_HEADLINE
                                    : creatorApplication.legalStatus === "legal_sent"
                                        ? "Your legal document is ready."
                                        : "Legal review complete."}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-gray-400">
                                {creatorApplication.legalStatus === "legal_pending"
                                    ? CREATOR_LEGAL_WAITING_HELPER
                                    : creatorApplication.legalStatus === "legal_sent"
                                        ? "Open the agreement from this page and complete any required signature steps when you are ready."
                                        : "Your signed legal record is already attached to the application."}
                            </p>
                        </article>

                        <article className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-base font-bold text-white">
                                <ShieldCheck className="h-5 w-5 text-brand-purple" />
                                ID verification
                            </div>
                            <p className="mt-3 text-sm font-semibold text-white">{idPresentation.label}</p>
                            <p className="mt-2 text-sm leading-7 text-gray-400">
                                {idPresentation.description}
                            </p>
                        </article>

                        <article className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-base font-bold text-white">
                                <BadgeCheck className="h-5 w-5 text-brand-purple" />
                                Creator access
                            </div>
                            {statusSummary.stage === "Approved" ? (
                                <div className="mt-3 space-y-2">
                                    {APPROVED_ACCESS_ITEMS.map((item) => (
                                        <p key={item} className="flex items-start gap-2 text-sm leading-6 text-gray-300">
                                            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                                            <span>{item}</span>
                                        </p>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-3 text-sm leading-7 text-gray-400">
                                    Creator tools stay locked until manual approval is complete. Completing intake means your application is submitted, not approved.
                                </p>
                            )}
                        </article>
                    </section>
                ) : null}

                {creatorApplication ? (
                    <section className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-base font-bold text-white">Current checklist</h2>
                                <p className="mt-2 text-sm leading-7 text-gray-400">
                                    Only real backend blockers are shown here.
                                </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                {blockingReasonDetails.length} blockers
                            </span>
                        </div>

                        <div className="mt-4 space-y-3">
                            {blockingReasonDetails.length === 0 ? (
                                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                                    You are caught up. The review team can keep moving your creator application forward.
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

                {creatorApplication && canEditApplication ? (
                    <section
                        id="creator-application-edit"
                        className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm"
                    >
                        <div className="flex items-start gap-2 text-base font-bold text-white">
                            <PencilLine className="mt-0.5 h-5 w-5 text-brand-purple" />
                            Revise your application
                        </div>
                        <p className="mt-3 text-sm leading-7 text-gray-400">
                            Until manual approval is granted, you can update your creator name, primary platform, and creator summary here. Changes update the same creator application record that admin review uses.
                        </p>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <label className="space-y-2">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Creator name</span>
                                <input
                                    value={editableDraft.creatorDisplayName}
                                    onChange={(event) => setEditableDraft((current) => ({
                                        ...current,
                                        creatorDisplayName: event.target.value,
                                    }))}
                                    className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none"
                                    placeholder="How should fans and reviewers know you?"
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Primary platform</span>
                                <input
                                    value={editableDraft.creatorPrimaryPlatform}
                                    onChange={(event) => setEditableDraft((current) => ({
                                        ...current,
                                        creatorPrimaryPlatform: event.target.value,
                                    }))}
                                    className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none"
                                    placeholder="TikTok, YouTube, Instagram, Twitch, or similar"
                                />
                            </label>

                            <label className="space-y-2 md:col-span-2">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Creator summary</span>
                                <textarea
                                    value={editableDraft.creatorContentFocus}
                                    onChange={(event) => setEditableDraft((current) => ({
                                        ...current,
                                        creatorContentFocus: event.target.value,
                                    }))}
                                    rows={4}
                                    className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none"
                                    placeholder="Give the review team concise context about what you create."
                                />
                            </label>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => void handleApplicationSave()}
                                disabled={savingApplication}
                                className="rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 disabled:opacity-60"
                            >
                                {savingApplication ? "Saving..." : "Save application changes"}
                            </button>
                            <a
                                href={creatorSupportHref}
                                className="rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm font-semibold text-gray-200"
                            >
                                Contact creator support
                            </a>
                        </div>
                    </section>
                ) : null}

                {creatorApplication && canSubmitId ? (
                    <section
                        id="creator-id-upload"
                        className="rounded-[1.75rem] border border-brand-purple/20 bg-brand-purple/10 p-4 backdrop-blur-sm"
                    >
                        <h2 className="flex items-center gap-2 text-base font-bold text-white">
                            <UploadCloud className="h-5 w-5 text-brand-purple" />
                            Upload your ID documents
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-gray-300">
                            ID verification is required for every creator applicant. Upload the front and back of the same government-issued photo ID so the review team can verify this step.
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
                    <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                        <article className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                            <h2 className="flex items-center gap-2 text-base font-bold text-white">
                                <BadgeCheck className="h-5 w-5 text-brand-purple" />
                                About Kreator Experiences
                            </h2>
                            <div className="mt-3 space-y-3 text-sm leading-7 text-gray-400">
                                <p>{KREATOR_EXPERIENCES_DEFINITION}</p>
                                <p>{CREATOR_REVIEW_TIMELINE_COPY}</p>
                                <p>This waiting page only claims what the backend can currently prove: your stage, your real legal state, your real ID state, and whether the review team still needs something from you.</p>
                            </div>
                        </article>

                        <article className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                            <h2 className="flex items-center gap-2 text-base font-bold text-white">
                                <LifeBuoy className="h-5 w-5 text-brand-purple" />
                                Creator support
                            </h2>
                            <p className="mt-3 text-sm leading-7 text-gray-400">
                                Use creator support if your application looks stuck, if the stage on this page contradicts what you were told, or if a required file or legal step is missing after review should have reached it.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-3">
                                <a
                                    href={creatorSupportHref}
                                    className="rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20"
                                >
                                    Email creator support
                                </a>
                                <Link
                                    href="/dashboard/profile"
                                    className="rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm font-semibold text-gray-200"
                                >
                                    Open profile
                                </Link>
                            </div>
                        </article>
                    </section>
                ) : null}
            </div>
        </main>
    );
}
