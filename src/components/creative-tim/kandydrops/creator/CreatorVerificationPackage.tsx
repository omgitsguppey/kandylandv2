"use client";

import { CheckCircle2, ShieldCheck, UploadCloud } from "lucide-react";

export type CreatorVerificationUploadSide = "front" | "back" | "face_with_id" | "video_with_id";

type VerificationUploadCard = {
    side: CreatorVerificationUploadSide;
    title: string;
    description: string;
    uploadedDocument?: { fileName: string } | null;
    selectedFile: File | null;
};

interface CreatorVerificationPackageProps {
    accept: string;
    hasSelectedFiles: boolean;
    requirements: readonly string[];
    summary: string;
    uploadButtonLabel: string;
    uploading: boolean;
    uploadCards: VerificationUploadCard[];
    onFileSelect: (side: CreatorVerificationUploadSide, file: File | null) => void;
    onUpload: () => void;
}

export function CreatorVerificationPackage({
    accept,
    hasSelectedFiles,
    requirements,
    summary,
    uploadButtonLabel,
    uploading,
    uploadCards,
    onFileSelect,
    onUpload,
}: CreatorVerificationPackageProps) {
    return (
        <section id="creator-id-upload" className="overflow-hidden rounded-[2rem] border border-brand-purple/30 bg-[linear-gradient(145deg,rgba(178,140,255,0.17),rgba(10,5,20,0.9)_52%,rgba(255,111,207,0.08))] shadow-[0_22px_68px_rgba(0,0,0,0.28)]" aria-labelledby="creator-id-upload-heading">
            <div className="p-5 sm:p-7">
                <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-purple">Protected identity checkpoint</p>
                        <h2 id="creator-id-upload-heading" className="mt-2 flex items-center gap-2 text-xl font-black tracking-[-0.03em] text-white sm:text-2xl">
                            <ShieldCheck className="h-5 w-5 shrink-0 text-brand-purple" aria-hidden="true" />
                            Complete your verification package
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-gray-300">Upload each required file in order when ID review opens. Your files stay within the protected review flow.</p>
                    </div>
                    <span className="inline-flex w-fit shrink-0 rounded-full border border-white/12 bg-black/30 px-3 py-1.5 text-xs font-bold text-gray-200">Private review</span>
                </div>

                <ol className="mt-5 space-y-2" aria-label="Verification requirements">
                    {requirements.map((requirement, index) => (
                        <li key={requirement} className="flex items-start gap-3 border-b border-white/10 py-3 last:border-b-0">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-purple/30 bg-brand-purple/12 text-[10px] font-black text-brand-purple">{String(index + 1).padStart(2, "0")}</span>
                            <p className="pt-0.5 text-sm leading-5 text-gray-200">{requirement}</p>
                        </li>
                    ))}
                </ol>

                <div className="mt-6 space-y-3">
                    {uploadCards.map((card) => (
                        <article key={card.side} className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4 sm:p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-sm font-black text-white">{card.title}</p>
                                    <p className="mt-1 text-xs leading-5 text-gray-400">{card.description}</p>
                                </div>
                                {card.uploadedDocument ? (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200">
                                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        Uploaded
                                    </span>
                                ) : (
                                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">Needed</span>
                                )}
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <label className="block min-w-0 flex-1">
                                    <span className="sr-only">{card.title}</span>
                                    <input
                                        type="file"
                                        accept={accept}
                                        onChange={(event) => onFileSelect(card.side, event.target.files?.[0] ?? null)}
                                        className="min-h-11 w-full rounded-[1rem] border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none file:mr-3 file:rounded-full file:border-0 file:bg-brand-purple file:px-3 file:py-2 file:text-xs file:font-bold file:text-white focus:border-brand-purple/60 focus:ring-2 focus:ring-brand-purple/20"
                                    />
                                </label>
                                <p className="text-xs text-gray-400 sm:max-w-64">
                                    {card.selectedFile
                                        ? `Ready to upload: ${card.selectedFile.name}`
                                        : card.uploadedDocument
                                            ? `Current file: ${card.uploadedDocument.fileName}`
                                            : "No file selected yet."}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-2xl text-xs leading-6 text-gray-300">{summary}</p>
                    <button
                        type="button"
                        onClick={onUpload}
                        disabled={uploading || !hasSelectedFiles}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[1rem] border border-brand-purple/55 bg-[linear-gradient(110deg,rgba(178,140,255,0.94),rgba(120,74,222,0.96))] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(164,118,255,0.2)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/70"
                    >
                        <UploadCloud className="h-4 w-4" aria-hidden="true" />
                        {uploading ? "Uploading..." : uploadButtonLabel}
                    </button>
                </div>
            </div>
        </section>
    );
}
