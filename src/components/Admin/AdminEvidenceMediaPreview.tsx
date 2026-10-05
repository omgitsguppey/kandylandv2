"use client";

import { FileText, LockKeyhole } from "lucide-react";

import type { AdminModerationMessageRecord } from "@/lib/admin-moderation";

export function AdminEvidenceMediaPreview({ message }: { message: AdminModerationMessageRecord }) {
    const fileType = message.assetMimeType || message.messageKind || "unknown";
    const fileName = message.assetName || "Shared evidence file";

    return (
        <article
            className="relative flex min-h-[4.75rem] items-center gap-3 overflow-hidden border-l-2 border-primary/45 bg-secondary px-3 py-3"
            data-admin-evidence-media-preview="metadata-only"
            data-evidence-raw-url-rendered="false"
        >
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-primary/70" />
            <span className="grid h-11 w-11 shrink-0 place-items-center border border-primary/20 bg-primary/[0.1]">
                <LockKeyhole className="h-5 w-5 text-primary/80" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-sm font-semibold text-foreground">{fileName}</p>
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-primary/65">Metadata only</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Safe admin evidence preview. Raw locked asset URLs are hidden unless a backed admin preview route exists.</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-muted-foreground">
                    <span>{fileType}</span>
                    <span>{message.senderRole}</span>
                    {message.costGd > 0 ? <span>{message.costGd} GD</span> : null}
                </div>
            </div>
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </article>
    );
}
