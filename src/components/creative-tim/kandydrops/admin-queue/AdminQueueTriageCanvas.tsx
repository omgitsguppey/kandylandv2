"use client";

import type { ReactNode } from "react";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";

type AdminQueueTriageCanvasProps = {
    eyebrow: string;
    title: string;
    subtitle: string;
    backLink?: ReactNode;
    action?: ReactNode;
    beforeContent?: ReactNode;
    stateContent?: ReactNode;
    children?: ReactNode;
};

export function AdminQueueTriageCanvas({
    eyebrow,
    title,
    subtitle,
    backLink,
    action,
    beforeContent,
    stateContent,
    children,
}: AdminQueueTriageCanvasProps) {
    return (
        <section
            className="min-w-0 space-y-4"
            data-admin-queue-canvas="task-triage"
        >
            <div className="min-w-0">
                {beforeContent}

                <AdminPageHeader compact eyebrow={eyebrow} title={title} subtitle={subtitle} actions={action} topSlot={backLink} />

                {stateContent ? (
                    stateContent
                ) : (
                    <section className="mt-4 min-w-0 space-y-4">
                        {children}
                    </section>
                )}
            </div>
        </section>
    );
}
