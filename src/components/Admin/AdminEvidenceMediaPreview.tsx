"use client";

import { FileText, LockKeyhole } from "lucide-react";

import type { AdminModerationMessageRecord } from "@/lib/admin-moderation";

export function AdminEvidenceMediaPreview({ message }: { message: AdminModerationMessageRecord }) {
    const fileType = message.assetMimeType || message.messageKind || "unknown";
    const fileName = message.assetName || "Shared evidence file";

    return (
        <article
            className="rounded-xl border border-white/10 bg-black/25 p-3"
            data-admin-evidence-media-preview="metadata-only"
            data-evidence-raw-url-rendered="false"
        >
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/10">
                    <LockKeyhole className="h-5 w-5 text-brand-purple" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{fileName}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-400">
                        Safe admin evidence preview. Raw locked asset URLs are hidden unless a backed admin preview route exists.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-300">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{fileType}</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{message.senderRole}</span>
                        {message.costGd > 0 ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{message.costGd} GD</span> : null}
                    </div>
                </div>
                <FileText className="mt-1 h-4 w-4 shrink-0 text-gray-500" />
            </div>
        </article>
    );
}
