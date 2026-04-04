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
    Sparkles,
    UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import {
    CREATOR_CONTRACT_SUMMARY_BULLETS,
    CREATOR_INTRO_CREATOR_BULLETS,
    CREATOR_INTRO_FAN_BULLETS,
    CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS,
} from "@/lib/creator-contract";
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
type IdUploadSide = "front" | "back" | "face_with_id" | "video_with_id";
type EditableApplicationDraft = {
    creatorDisplayName: string;
    creatorPrimaryPlatform: string;
    creatorContentFocus: string;
};

const ID_UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,.mp4,.mov,.webm";
const ID_UPLOAD_REQUIREMENTS = [
    "Front of a government-issued photo ID",
    "Back of the same ID",
    "A selfie holding that ID",
    "A short video holding the ID while stating your government name and today's date",
    "Images, PDFs, and common video formats up to 15MB each",
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
    {
        side: "face_with_id",
        title: "Face with ID",
        description: "Show your face clearly while holding the same ID used in this application.",
    },
    {
        side: "video_with_id",
        title: "Video with ID",
        description: "Record a short video holding the ID and saying your government name and today's date.",
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

function buildUploadButtonLabel(selectedCount: number) {
    if (selectedCount >= 4) {
        return "Upload full verification package";
    }

    if (selectedCount > 0) {
        return `Upload ${selectedCount} verification file${selectedCount === 1 ? "" : "s"}`;
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
            description: "ID verification is required for every creator application. Upload the full four-part verification package from this page when the secure upload step is available.",
        };
    }

    if (!complete) {
        return {
            label: "Pending",
            description: "Part of the verification package is already in. Upload the remaining files from this page so identity review can continue.",
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
        face_with_id: null,
        video_with_id: null,
    });
    const [editableDraft, setEditableDraft] = useState<EditableApplicationDraft>(buildDefaultEditableDraft(userProfile?.creatorApplication));
    const [uploadingId, setUploadingId] = useState(false);
    const [savingApplication, setSavingApplication] = useState(false);
    const [acknowledgingIntro, setAcknowledgingIntro] = useState(false);
    const [signatureName, setSignatureName] = useState("");
    const [signingContract, setSigningContract] = useState(false);

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
    const selectedUploadCount = Object.values(selectedIdFiles).filter(Boolean).length;
    const hasSelectedFiles = selectedUploadCount > 0;
    const uploadButtonLabel = buildUploadButtonLabel(selectedUploadCount);
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

    const introAcknowledged = Boolean(creatorApplication?.introAcknowledgedAt);
    const contractReady = creatorApplication?.contractDocumentStatus === "contract_sent";
    const creatorContractSigned = creatorApplication?.creatorSignatureStatus === "signature_signed";
    const adminCountersigned = creatorApplication?.adminSignatureStatus === "signature_signed";
    const currentAction = creatorApplication
        ? statusSummary.stage === "Approved"
            ? {
                title: "Open your creator tools",
                description: "Approval is complete. Use your creator dashboard and standard creator management pages for profile updates, drops, messaging, bookings, and payouts where they are enabled.",
            }
            : !introAcknowledged
                ? {
                    title: "Acknowledge the creator program",
                    description: "Read the short creator and fan explainer on this page before the identity and contract steps can continue.",
                }
                : canSubmitId
                ? {
                    title: "Upload your verification package",
                    description: idSummary.count > 0
                        ? "Part of the required verification package is already in. Upload the remaining files so identity review can continue."
                        : "Your next step is to upload the required verification package from this page.",
                }
                : contractReady && !creatorContractSigned
                    ? {
                        title: "Review and sign your agreement",
                        description: "Read the summary, review the full agreement, and add your signature from this page when you are ready.",
                    }
                    : creatorContractSigned && !adminCountersigned
                        ? {
                            title: "Wait for countersign",
                            description: "Your signature is on file. The agreement is still waiting for admin countersign before approval can continue.",
                        }
                        : contractReady
                            ? {
                                title: "Wait for review updates",
                                description: "Your agreement and verification steps are in progress. This page will update again if the review team needs changes or when approval is complete.",
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
    const stageHistory = creatorApplication ? [
        { label: "Application submitted", at: creatorApplication.submittedAt },
        { label: "Creator intro acknowledged", at: creatorApplication.introAcknowledgedAt },
        { label: "ID requested", at: creatorApplication.idVerificationRequestedAt },
        { label: "ID submitted", at: creatorApplication.idVerificationSubmittedAt },
        { label: "ID reviewed", at: creatorApplication.idVerificationReviewedAt },
        { label: "Creator signed agreement", at: creatorApplication.creatorContractSignedAt },
        { label: "Admin countersigned", at: creatorApplication.adminContractSignedAt },
        {
            label: creatorApplication.approvalStatus === "creator_rejected"
                ? "Application rejected"
                : creatorApplication.approvalStatus === "creator_needs_changes"
                    ? "Returned for changes"
                    : creatorApplication.approvalStatus === "creator_approved"
                        ? "Approved"
                        : "Last review touch",
            at: creatorApplication.approvalStatus === "creator_rejected"
                ? creatorApplication.rejectedAt
                : creatorApplication.updatedAt,
        },
    ].filter((entry) => typeof entry.at === "number" && entry.at > 0) : [];

    const handleIntroAcknowledgement = async () => {
        try {
            setAcknowledgingIntro(true);
            const response = await authFetch("/api/creator/onboarding/intro", {
                method: "POST",
            });
            const result = await response.json().catch(() => ({})) as {
                error?: string;
                creatorApplication?: CreatorApplicationState;
            };

            if (!response.ok || !result.creatorApplication) {
                throw new Error(result.error || "Failed to record the creator intro acknowledgment.");
            }

            setCreatorApplicationState(result.creatorApplication);
            toast.success("Creator intro acknowledged.");
        } catch (error) {
            reportClientIssue({
                channel: "auth",
                severity: "error",
                message: "Creator intro acknowledgment failed",
                error,
                detail: {
                    action: "acknowledge_creator_intro",
                    userId: user?.uid ?? null,
                },
                consoleLabel: "[Creator Waitlist] intro acknowledgment failed",
            });
            toast.error(error instanceof Error ? error.message : "Failed to record the creator intro acknowledgment.");
        } finally {
            setAcknowledgingIntro(false);
        }
    };

    const handleContractSignature = async () => {
        if (signatureName.trim().length < 2) {
            toast.error("Enter your legal name before signing.");
            return;
        }

        try {
            setSigningContract(true);
            const response = await authFetch("/api/creator/onboarding/contract-signature", {
                method: "POST",
                body: JSON.stringify({
                    signatureName: signatureName.trim(),
                }),
            });
            const result = await response.json().catch(() => ({})) as {
                error?: string;
                creatorApplication?: CreatorApplicationState;
            };

            if (!response.ok || !result.creatorApplication) {
                throw new Error(result.error || "Failed to sign the creator agreement.");
            }

            setCreatorApplicationState(result.creatorApplication);
            toast.success("Agreement signed.");
        } catch (error) {
            reportClientIssue({
                channel: "auth",
                severity: "error",
                message: "Creator contract signing failed",
                error,
                detail: {
                    action: "sign_creator_contract",
                    userId: user?.uid ?? null,
                },
                consoleLabel: "[Creator Waitlist] contract signing failed",
            });
            toast.error(error instanceof Error ? error.message : "Failed to sign the creator agreement.");
        } finally {
            setSigningContract(false);
        }
    };

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
            toast.error("Choose one or more verification files before uploading.");
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
                face_with_id: null,
                video_with_id: null,
            });

            const nextSummary = getCreatorOnboardingIdDocumentSummary(nextCreatorApplication);
            toast.success(nextSummary.complete
                ? "The full verification package is in. The review team can now verify your identity."
                : "Verification file uploaded. Add the remaining files when you are ready.");
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
                                        {!introAcknowledged ? (
                                            <a
                                                href="#creator-intro"
                                                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-gray-100"
                                            >
                                                Review creator intro
                                            </a>
                                        ) : null}
                                        {contractReady && !creatorContractSigned ? (
                                            <a
                                                href="#creator-contract"
                                                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-gray-100"
                                            >
                                                Review agreement
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
                                        <p>The creator intro acknowledgment is required before identity and contract review continue.</p>
                                        <p>The legal step on this page is the native in-app agreement flow, not a fake external placeholder.</p>
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
                                {creatorApplication.contractDocumentStatus !== "contract_sent"
                                    ? CREATOR_LEGAL_WAITING_HEADLINE
                                    : creatorApplication.creatorSignatureStatus !== "signature_signed"
                                        ? "Your creator agreement is ready."
                                        : creatorApplication.adminSignatureStatus !== "signature_signed"
                                            ? "Waiting on admin countersign."
                                        : "Legal review complete."}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-gray-400">
                                {creatorApplication.contractDocumentStatus !== "contract_sent"
                                    ? CREATOR_LEGAL_WAITING_HELPER
                                    : creatorApplication.creatorSignatureStatus !== "signature_signed"
                                        ? "Review the summary, read the full agreement, and sign from this page when you are ready."
                                        : creatorApplication.adminSignatureStatus !== "signature_signed"
                                            ? "Your signature is on file. Approval stays blocked until admin countersign is complete or owner override is used."
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

                {creatorApplication ? (
                    <section className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
                        <article id="creator-intro" className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-base font-bold text-white">
                                <Sparkles className="h-5 w-5 text-brand-purple" />
                                Creator intro
                            </div>
                            <p className="mt-3 text-sm leading-7 text-gray-400">
                                This short intro is required acknowledgment before identity review and contract signing continue.
                            </p>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">For creators</p>
                                    <div className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                                        {CREATOR_INTRO_CREATOR_BULLETS.map((bullet) => <p key={bullet}>- {bullet}</p>)}
                                    </div>
                                </div>
                                <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">For fans</p>
                                    <div className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                                        {CREATOR_INTRO_FAN_BULLETS.map((bullet) => <p key={bullet}>- {bullet}</p>)}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-3">
                                {introAcknowledged ? (
                                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                                        Acknowledged on {new Date(creatorApplication.introAcknowledgedAt!).toLocaleString()}
                                    </span>
                                ) : (
                                    <button type="button" onClick={() => void handleIntroAcknowledgement()} disabled={acknowledgingIntro} className="rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 disabled:opacity-50">
                                        {acknowledgingIntro ? "Saving..." : "Acknowledge creator intro"}
                                    </button>
                                )}
                            </div>
                        </article>

                        <article id="creator-contract" className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-base font-bold text-white">
                                <BadgeCheck className="h-5 w-5 text-brand-purple" />
                                Creator agreement
                            </div>
                            <p className="mt-3 text-sm leading-7 text-gray-400">
                                The contract step stays native to this product: plain-language summary first, then the full agreement, then signature capture, then the internal audit trail.
                            </p>
                            <div className="mt-4 rounded-[1.3rem] border border-white/10 bg-black/25 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Plain-language summary</p>
                                <div className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                                    {CREATOR_CONTRACT_SUMMARY_BULLETS.map((bullet) => <p key={bullet}>- {bullet}</p>)}
                                </div>
                            </div>
                            <details className="mt-4 rounded-[1.3rem] border border-white/10 bg-black/25 p-3">
                                <summary className="cursor-pointer text-sm font-semibold text-white">Read the full MGSA</summary>
                                <div className="mt-3 space-y-3 text-sm leading-6 text-gray-300">
                                    {CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS.map((section) => (
                                        <div key={section.heading}>
                                            <p className="font-semibold text-white">{section.heading}</p>
                                            <p className="mt-1">{section.body}</p>
                                        </div>
                                    ))}
                                </div>
                            </details>
                            <div className="mt-4 space-y-3">
                                <label className="space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Legal signature name</span>
                                    <input
                                        value={signatureName}
                                        onChange={(event) => setSignatureName(event.target.value)}
                                        className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none"
                                        placeholder="Enter your legal name exactly as it should appear"
                                    />
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    {creatorContractSigned ? (
                                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                                            Signed on {new Date(creatorApplication.creatorContractSignedAt!).toLocaleString()}
                                        </span>
                                    ) : (
                                        <button type="button" onClick={() => void handleContractSignature()} disabled={signingContract || !contractReady} className="rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 disabled:opacity-50">
                                            {signingContract ? "Signing..." : "Sign agreement"}
                                        </button>
                                    )}
                                    {adminCountersigned ? (
                                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                                            Countersigned on {new Date(creatorApplication.adminContractSignedAt!).toLocaleString()}
                                        </span>
                                    ) : (
                                        <span className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-gray-300">
                                            Admin countersign still pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        </article>
                    </section>
                ) : null}

                {creatorApplication ? (
                    <section className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
                        <h2 className="text-base font-bold text-white">Stage history</h2>
                        <p className="mt-2 text-sm leading-7 text-gray-400">
                            Creators only see milestone history from the real backend stages and signatures attached to this application.
                        </p>
                        <div className="mt-4 space-y-3">
                            {stageHistory.map((entry) => (
                                <div key={`${entry.label}-${entry.at}`} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                                    <p className="text-sm font-semibold text-white">{entry.label}</p>
                                    <p className="mt-1 text-xs text-gray-400">{new Date(entry.at!).toLocaleString()}</p>
                                </div>
                            ))}
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
                            Upload your verification package
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-gray-300">
                            ID verification is required for every creator applicant. Upload the full verification package here: front of ID, back of ID, face with ID, and the short video holding the ID and stating your government name and today&apos;s date.
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
                                    ? "No verification files have been received yet."
                                    : idSummary.complete
                                        ? "The full verification package is uploaded and ready for review."
                                        : "Part of the verification package is in. Upload the remaining files to finish this step."}
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
