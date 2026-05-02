"use client";

import { CheckCircle2 } from "lucide-react";

type CreatorAgreementSignatureSectionProps = {
    creatorContractSigned: boolean;
    adminCountersigned: boolean;
    creatorContractSignedAt?: number;
    adminContractSignedAt?: number;
    signatureName: string;
    signingContract: boolean;
    readiness: {
        canSign: boolean;
        buttonLabel: string;
        missingReasons: string[];
    };
    onSignatureNameChange: (value: string) => void;
    onSign: () => void;
};

export function CreatorAgreementSignatureSection({
    creatorContractSigned,
    adminCountersigned,
    creatorContractSignedAt,
    adminContractSignedAt,
    signatureName,
    signingContract,
    readiness,
    onSignatureNameChange,
    onSign,
}: CreatorAgreementSignatureSectionProps) {
    return (
        <section id="creator-agreement-signature" className="mt-4 rounded-[1.3rem] border border-white/10 bg-black/25 p-3">
            <h3 className="text-sm font-semibold text-white">Signature</h3>
            {creatorContractSigned ? (
                <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                    <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        Agreement signed
                    </div>
                    <p className="mt-2 leading-6">
                        Your agreement is recorded. Admin countersign and review may still be required before creator tools activate.
                    </p>
                    {creatorContractSignedAt ? (
                        <p className="mt-2 text-xs text-emerald-200">Signed on {new Date(creatorContractSignedAt).toLocaleString()}</p>
                    ) : null}
                </div>
            ) : (
                <>
                    <label className="mt-3 block space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Legal signature name</span>
                        <input
                            value={signatureName}
                            onChange={(event) => onSignatureNameChange(event.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none"
                            placeholder="Enter your legal name exactly as it should appear"
                        />
                    </label>

                    {readiness.missingReasons.length > 0 ? (
                        <p className="mt-3 text-xs leading-5 text-gray-400">
                            {readiness.missingReasons[0]}
                        </p>
                    ) : null}

                    <div className="sticky bottom-3 z-10 mt-4 rounded-[1.25rem] border border-brand-purple/25 bg-zinc-950/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/40 backdrop-blur">
                        <button
                            type="button"
                            onClick={onSign}
                            disabled={signingContract || !readiness.canSign}
                            className="w-full rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 disabled:opacity-50"
                        >
                            {signingContract ? "Signing..." : readiness.buttonLabel}
                        </button>
                    </div>
                </>
            )}

            {adminCountersigned ? (
                <p className="mt-3 text-xs text-emerald-200">
                    Admin countersigned on {new Date(adminContractSignedAt!).toLocaleString()}
                </p>
            ) : creatorContractSigned ? (
                <p className="mt-3 text-xs text-gray-400">Waiting for admin countersign.</p>
            ) : null}
        </section>
    );
}
