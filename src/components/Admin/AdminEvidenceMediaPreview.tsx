"use client";

import { FileText, LockKeyhole } from "lucide-react";

import type { AdminModerationMessageRecord } from "@/lib/admin-moderation";

export function AdminEvidenceMediaPreview({ message }: { message: AdminModerationMessageRecord }) {
    const fileType = message.assetMimeType || message.messageKind || "unknown";
    const fileName = message.assetName || "Shared evidence file";

    return (
        <article
            className="relative flex min-h-[4.75rem] items-center gap-3 overflow-hidden border-l-2 border-fuchsia-300/45 bg-white/[0.035] px-3 py-3"
            data-admin-evidence-media-preview="metadata-only"
            data-evidence-raw-url-rendered="false"
        >
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-fuchsia-200/70" />
            <span className="grid h-11 w-11 shrink-0 place-items-center border border-fuchsia-300/20 bg-fuchsia-400/[0.1]">
                <LockKeyhole className="h-5 w-5 text-fuchsia-100/80" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-sm font-black text-white">{fileName}</p>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-fuchsia-100/65">Metadata only</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-400">Safe admin evidence preview. Raw locked asset URLs are hidden unless a backed admin preview route exists.</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-gray-300">
                    <span>{fileType}</span>
                    <span>{message.senderRole}</span>
                    {message.costGd > 0 ? <span>{message.costGd} GD</span> : null}
                </div>
            </div>
            <FileText className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
        </article>
    );
}
