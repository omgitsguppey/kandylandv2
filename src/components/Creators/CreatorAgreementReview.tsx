"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, FileText } from "lucide-react";

import { CreatorAgreementFullText } from "@/components/Creators/CreatorAgreementFullText";
import { CreatorAgreementSignatureSection } from "@/components/Creators/CreatorAgreementSignatureSection";
import {
    CREATOR_CONTRACT_SUMMARY_BULLETS,
    CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS,
} from "@/lib/creator-contract";
import type { CreatorAgreementSource } from "@/lib/creator-agreement-documents";
import {
    CREATOR_AGREEMENT_ACKNOWLEDGEMENTS,
    CREATOR_AGREEMENT_REVIEW_SECTIONS,
    buildCreatorAgreementTelemetryPayload,
    buildDefaultCreatorAgreementAcknowledgements,
    getCreatorAgreementSignatureReadiness,
    getCreatorAgreementStatusCopy,
    isCreatorAgreementContentSourceAvailable,
    type CreatorAgreementAcknowledgementKey,
    type CreatorAgreementAcknowledgementValues,
} from "@/lib/creator-agreement-signature-ux";
import type {
    CreatorContractDocumentStatus,
    CreatorContractSignatureStatus,
    CreatorOnboardingLegalStatus,
} from "@/lib/creator-onboarding";
import { trackEvent } from "@/lib/telemetry";

type CreatorAgreementApplication = {
    contractDocumentStatus?: CreatorContractDocumentStatus;
    creatorSignatureStatus?: CreatorContractSignatureStatus;
    adminSignatureStatus?: CreatorContractSignatureStatus;
    legalStatus?: CreatorOnboardingLegalStatus;
    contractVersion?: string;
    agreementTitle?: string;
    agreementHash?: string;
    agreementSource?: CreatorAgreementSource;
    agreementDispatchId?: string;
    legalDocumentSentAt?: number;
    creatorContractSignedAt?: number;
    adminContractSignedAt?: number;
    updatedAt?: number;
};

type CreatorAgreementReviewProps = {
    application: CreatorAgreementApplication;
    currentUserId?: string | null;
    currentUserEmail?: string | null;
    signingContract: boolean;
    onSign: (input: {
        signatureName: string;
        acknowledgementValues: CreatorAgreementAcknowledgementValues;
    }) => void | Promise<void>;
};

const DEFAULT_OPEN_AGREEMENT_SECTIONS = CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS.reduce((state, section, index) => {
    state[section.heading] = index === 0;
    return state;
}, {} as Record<string, boolean>);

function formatAgreementDate(value?: number) {
    if (!value || value <= 0) {
        return "Date pending";
    }

    return new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export function CreatorAgreementReview({
    application,
    currentUserId,
    currentUserEmail,
    signingContract,
    onSign,
}: CreatorAgreementReviewProps) {
    const [signatureName, setSignatureName] = useState("");
    const [acknowledgementValues, setAcknowledgementValues] = useState<CreatorAgreementAcknowledgementValues>(() => buildDefaultCreatorAgreementAcknowledgements());
    const [openAgreementSections, setOpenAgreementSections] = useState<Record<string, boolean>>(DEFAULT_OPEN_AGREEMENT_SECTIONS);
    const viewedRef = useRef<string | null>(null);

    const contractReady = application.contractDocumentStatus === "contract_sent";
    const creatorContractSigned = application.creatorSignatureStatus === "signature_signed";
    const adminCountersigned = application.adminSignatureStatus === "signature_signed";
    const hasUploadedAgreementDocument = application.agreementSource === "uploaded_pdf_snapshot" || application.agreementSource === "hybrid";
    const contentSourceAvailable = isCreatorAgreementContentSourceAvailable({
        agreementSource: application.agreementSource,
        hasUploadedAgreementDocument,
        hasNativeAgreementSections: CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS.length > 0,
    });
    const statusCopy = getCreatorAgreementStatusCopy({
        contractDocumentStatus: application.contractDocumentStatus,
        creatorSignatureStatus: application.creatorSignatureStatus,
        adminSignatureStatus: application.adminSignatureStatus,
        legalStatus: application.legalStatus,
    });
    const lastUpdatedAt = application.legalDocumentSentAt || application.updatedAt;
    const baseTelemetry = useMemo(() => ({
        actorUid: currentUserId,
        actorEmail: currentUserEmail,
        agreementVersion: application.contractVersion,
        agreementHash: application.agreementHash,
        dispatchId: application.agreementDispatchId,
    }), [currentUserEmail, currentUserId, application.agreementDispatchId, application.agreementHash, application.contractVersion]);
    const readiness = getCreatorAgreementSignatureReadiness({
        isAuthenticated: Boolean(currentUserId),
        isAlreadySigned: creatorContractSigned,
        contractDocumentStatus: application.contractDocumentStatus,
        agreementVersion: application.contractVersion,
        agreementHash: application.agreementHash,
        dispatchId: application.agreementDispatchId,
        signerName: signatureName,
        signerEmail: currentUserEmail,
        contentSourceAvailable,
        acknowledgementValues,
    });

    useEffect(() => {
        if (!contractReady || creatorContractSigned || !application.agreementDispatchId) {
            return;
        }

        const viewKey = `${application.agreementDispatchId}:${application.agreementHash || "missing_hash"}`;
        if (viewedRef.current === viewKey) {
            return;
        }

        viewedRef.current = viewKey;
        trackEvent("creator_agreement_viewed", buildCreatorAgreementTelemetryPayload({
            ...baseTelemetry,
            actionKey: "creator_agreement_viewed",
        }));
    }, [baseTelemetry, contractReady, creatorContractSigned, application.agreementDispatchId, application.agreementHash]);

    const handleAcknowledgementChange = (key: CreatorAgreementAcknowledgementKey, checked: boolean) => {
        const nextValues = {
            ...acknowledgementValues,
            [key]: checked,
        };
        setAcknowledgementValues(nextValues);
        trackEvent("creator_agreement_acknowledgement_checked", buildCreatorAgreementTelemetryPayload({
            ...baseTelemetry,
            actionKey: "creator_agreement_acknowledgement_checked",
            sectionKey: key,
            extra: {
                acknowledgementKey: key,
                acknowledgementChecked: checked,
            },
        }));
    };

    const handleAgreementSectionToggle = (sectionKey: string) => {
        setOpenAgreementSections((current) => {
            const nextOpen = !current[sectionKey];
            if (nextOpen) {
                trackEvent("creator_agreement_section_opened", buildCreatorAgreementTelemetryPayload({
                    ...baseTelemetry,
                    actionKey: "creator_agreement_section_opened",
                    sectionKey,
                }));
            }

            return {
                ...current,
                [sectionKey]: nextOpen,
            };
        });
    };

    const handleSign = () => {
        if (!readiness.canSign) {
            return;
        }

        trackEvent("creator_agreement_signed", buildCreatorAgreementTelemetryPayload({
            ...baseTelemetry,
            actionKey: "creator_agreement_signed",
        }));
        void onSign({
            signatureName: signatureName.trim(),
            acknowledgementValues,
        });
    };

    return (
        <article id="creator-contract" className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-base font-bold text-white">
                        <BadgeCheck className="h-5 w-5 text-brand-purple" />
                        Creator Service Agreement
                    </div>
                    <p className="mt-3 text-sm leading-6 text-gray-400">
                        Review the full agreement before signing. Your signature, agreement version, timestamp, and device details are stored in the audit trail.
                    </p>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                    {statusCopy.label}
                </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-gray-300">{statusCopy.helper}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Agreement version</p>
                    <p className="mt-2 text-sm font-semibold text-white">{application.contractVersion || "Version pending"}</p>
                </div>
                <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-3 sm:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Document title</p>
                    <p className="mt-2 text-sm font-semibold text-white">{application.agreementTitle || "KandyDrops Creator Service Agreement"}</p>
                </div>
                <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-3 sm:col-span-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Last updated</p>
                    <p className="mt-2 text-sm font-semibold text-white">{formatAgreementDate(lastUpdatedAt)}</p>
                </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-4" aria-label="Agreement review sections">
                {CREATOR_AGREEMENT_REVIEW_SECTIONS.map((section) => (
                    <a
                        key={section.key}
                        href={`#creator-agreement-${section.key}`}
                        className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-center text-xs font-semibold text-gray-200 transition-colors hover:border-brand-purple/40 hover:text-white"
                    >
                        {section.label}
                    </a>
                ))}
            </div>

            <section id="creator-agreement-summary" className="mt-4 rounded-[1.3rem] border border-white/10 bg-black/25 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <FileText className="h-4 w-4 text-brand-purple" />
                    Summary
                </div>
                <div className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                    {CREATOR_CONTRACT_SUMMARY_BULLETS.map((bullet) => <p key={bullet}>- {bullet}</p>)}
                </div>
            </section>

            <section id="creator-agreement-acknowledgements" className="mt-4 rounded-[1.3rem] border border-white/10 bg-black/25 p-3">
                <h3 className="text-sm font-semibold text-white">Important acknowledgements</h3>
                <div className="mt-3 space-y-2">
                    {CREATOR_AGREEMENT_ACKNOWLEDGEMENTS.map((acknowledgement) => (
                        <label key={acknowledgement.key} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-sm leading-6 text-gray-200">
                            <input
                                type="checkbox"
                                checked={acknowledgementValues[acknowledgement.key]}
                                disabled={creatorContractSigned}
                                onChange={(event) => handleAcknowledgementChange(acknowledgement.key, event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-white/20 bg-black text-brand-purple"
                            />
                            <span>{acknowledgement.label}</span>
                        </label>
                    ))}
                </div>
            </section>

            <CreatorAgreementFullText
                hasUploadedAgreementDocument={hasUploadedAgreementDocument}
                openAgreementSections={openAgreementSections}
                onToggleSection={handleAgreementSectionToggle}
            />

            <CreatorAgreementSignatureSection
                creatorContractSigned={creatorContractSigned}
                adminCountersigned={adminCountersigned}
                creatorContractSignedAt={application.creatorContractSignedAt}
                adminContractSignedAt={application.adminContractSignedAt}
                signatureName={signatureName}
                signingContract={signingContract}
                readiness={readiness}
                onSignatureNameChange={setSignatureName}
                onSign={handleSign}
            />
        </article>
    );
}
