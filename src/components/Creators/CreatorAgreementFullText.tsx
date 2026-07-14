"use client";

import { ChevronDown } from "lucide-react";

import { CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS } from "@/lib/creator-contract";

type CreatorAgreementFullTextProps = {
    hasUploadedAgreementDocument: boolean;
    openAgreementSections: Record<string, boolean>;
    onToggleSection: (sectionKey: string) => void;
};

export function CreatorAgreementFullText({
    hasUploadedAgreementDocument,
    openAgreementSections,
    onToggleSection,
}: CreatorAgreementFullTextProps) {
    return (
        <section id="creator-agreement-full_agreement" className="mt-4 rounded-[1.3rem] border border-white/10 bg-black/25 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-white">Full agreement</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                        Open each section here, or view the full document source when it is available.
                    </p>
                </div>
                {hasUploadedAgreementDocument ? (
                    <a href="/api/creator/onboarding/agreement-document" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-black/25 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/20">
                        View/download PDF
                    </a>
                ) : null}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Full agreement table of contents">
                {CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS.map((section) => (
                    <button
                        key={`toc-${section.heading}`}
                        type="button"
                        onClick={() => onToggleSection(section.heading)}
                        className="min-h-11 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-left text-xs font-semibold text-gray-200 transition-colors hover:border-brand-purple/40 hover:text-white"
                    >
                        {section.heading}
                    </button>
                ))}
            </div>

            <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1 text-sm leading-6 text-gray-300" data-ui-nested-scroll="approved" data-ui-scroll-owner="creator-agreement-full-text">
                {CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS.map((section) => {
                    const isOpen = openAgreementSections[section.heading] === true;

                    return (
                        <div key={section.heading} className="rounded-2xl border border-white/10 bg-black/25">
                            <button
                                type="button"
                                aria-expanded={isOpen}
                                onClick={() => onToggleSection(section.heading)}
                                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-semibold text-white"
                            >
                                <span>{section.heading}</span>
                                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isOpen ? (
                                <p className="border-t border-white/10 px-3 py-3 text-gray-300">{section.body}</p>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
