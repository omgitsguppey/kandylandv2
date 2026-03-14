"use client";

import { useState } from "react";
import { Bug, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

interface ReportBugButtonProps {
    context: string;
    className?: string;
    label?: string;
}

export function ReportBugButton({
    context,
    className,
    label = "Report a bug",
}: ReportBugButtonProps) {
    const { user } = useAuth();
    const { openAuthModal } = useUI();
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const openComposer = () => {
        if (!user) {
            openAuthModal("signup");
            toast.info("Create a free profile so we can follow up on your report.");
            return;
        }

        trackEvent("feedback_modal_opened", {
            source: "inline_bug_report",
            context,
        });
        setIsOpen(true);
    };

    const closeComposer = (force = false) => {
        if (submitting && !force) {
            return;
        }

        setIsOpen(false);
        setMessage("");
    };

    const submitBugReport = async () => {
        const trimmedMessage = message.trim();

        if (trimmedMessage.length < 12) {
            toast.error("Add a little more detail so we know what went wrong.");
            return;
        }

        setSubmitting(true);
        try {
            const response = await authFetch("/api/tasks/feedback", {
                method: "POST",
                body: JSON.stringify({
                    message: `[${context}] ${trimmedMessage}`,
                    category: "bug_report",
                }),
            });
            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Bug report failed");
            }

            trackEvent("feedback_submitted", {
                category: "bug_report",
                context,
                message_length: trimmedMessage.length,
            });
            toast.success("Bug report sent. Thanks for helping tighten things up.");
            closeComposer(true);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Bug report failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={openComposer}
                className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition-colors hover:text-white",
                    className,
                )}
            >
                <Bug className="h-3.5 w-3.5" />
                {label}
            </button>

            {isOpen ? (
                <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                    <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/10 p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-purple">
                                    Bug Report
                                </p>
                                <h2 className="mt-1 text-xl font-bold text-white">Tell us what felt off</h2>
                                <p className="mt-2 text-sm leading-6 text-gray-400">
                                    We&apos;ll log this with its screen context so the team can tighten the flow.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => closeComposer()}
                                className="rounded-full border border-white/10 bg-white/5 p-2 text-gray-400 transition-colors hover:text-white"
                                aria-label="Close bug report"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mt-4 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-gray-300">
                            Screen: {context}
                        </div>

                        <textarea
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            className="mt-4 h-32 w-full rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple"
                            placeholder="What happened, and what did you expect instead?"
                        />

                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={() => closeComposer()}
                                className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitBugReport}
                                disabled={submitting}
                                className="flex-1 rounded-full border border-brand-purple bg-brand-purple px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                            >
                                {submitting ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Send report"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
