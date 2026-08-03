"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Bug, ChevronDown, ChevronUp, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { useRolloutEnabled, useRollouts } from "@/context/RolloutContext";
import { useUI } from "@/context/UIContext";
import { dispatchActivitySync } from "@/lib/activity-sync";
import { authFetch } from "@/lib/authFetch";
import {
  BUG_REPORT_ISSUE_OPTIONS,
  type BugReportIssueType,
  type BugReportSeverity,
  buildBugReportSummary,
  resolveBugReportComponentMeta,
} from "@/lib/bug-reporting";
import { getClientDebugSnapshot, recordClientDiagnostic } from "@/lib/client-diagnostics";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

type ReportBugButtonVariant = "text" | "pill" | "icon" | "floating";

interface ReportBugButtonProps {
  context: string;
  className?: string;
  label?: string;
  variant?: ReportBugButtonVariant;
  defaultIssueType?: BugReportIssueType;
}

export function ReportBugButton({
  context,
  className,
  label = "Report a bug",
  variant = "text",
  defaultIssueType = "action_failed",
}: ReportBugButtonProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { assignments } = useRollouts();
  const { openAuthModal } = useUI();
  const autoContextEnabled = useRolloutEnabled("bug_report_auto_context_v2");
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const [issueType, setIssueType] = useState<BugReportIssueType>(defaultIssueType);
  const [severity, setSeverity] = useState<BugReportSeverity>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [showAutoContext, setShowAutoContext] = useState(false);

  const componentMeta = useMemo(
    () => resolveBugReportComponentMeta(context, pathname || "/"),
    [context, pathname],
  );

  const rolloutSnapshot = useMemo(
    () => assignments.map((assignment) => ({
      id: assignment.id,
      variant: assignment.variant,
      reason: assignment.reason,
      active: assignment.active,
    })),
    [assignments],
  );

  const snapshotPreview = useMemo(
    () => autoContextEnabled
      ? getClientDebugSnapshot(componentMeta, rolloutSnapshot)
      : getClientDebugSnapshot(componentMeta, []),
    [autoContextEnabled, componentMeta, rolloutSnapshot],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || submitting) {
        return;
      }

      setIsOpen(false);
      setNote("");
      setIssueType(defaultIssueType);
      setSeverity("medium");
      setShowAutoContext(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, submitting, defaultIssueType]);

  const openComposer = () => {
    if (!user) {
      openAuthModal("signup");
      toast.info("Create a free profile so we can follow up on your report.");
      return;
    }

    trackEvent("feedback_modal_opened", {
      source: "inline_bug_report",
      source_component: "report_bug_button",
      context,
      component_name: componentMeta.componentName,
    });
    setIsOpen(true);
  };

  const closeComposer = (force = false) => {
    if (submitting && !force) {
      return;
    }

    setIsOpen(false);
    setNote("");
    setIssueType(defaultIssueType);
    setSeverity("medium");
    setShowAutoContext(false);
  };

  const submitBugReport = async () => {
    setSubmitting(true);
    try {
      const snapshot = autoContextEnabled
        ? getClientDebugSnapshot(componentMeta, rolloutSnapshot)
        : undefined;
      const summary = buildBugReportSummary({
        issueType,
        severity,
        component: componentMeta,
        pathname: snapshot?.currentPath || pathname || componentMeta.routeHint || "/",
        note,
      });

      const response = await authFetch("/api/tasks/feedback", {
        method: "POST",
        body: JSON.stringify({
          message: note.trim(),
          summary,
          category: "bug_report",
          contextId: context,
          issueType,
          severity,
          component: componentMeta,
          autoContext: snapshot,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Bug report failed");
      }

      dispatchActivitySync();
      toast.success("Bug report sent with runtime diagnostics attached.");
      closeComposer(true);
    } catch (error) {
      recordClientDiagnostic("feedback", "Bug report submission failed", {
        context,
        issueType,
        severity,
        message: error instanceof Error ? error.message : String(error),
      }, "error");
      toast.error(error instanceof Error ? error.message : "Bug report failed");
    } finally {
      setSubmitting(false);
    }
  };

  const buttonClassName = cn(
    "transition-colors active:scale-95",
    variant === "floating"
      ? "inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3.5 text-[11px] font-semibold text-gray-200 shadow-xl shadow-black/40 backdrop-blur-md hover:border-brand-purple/30 hover:text-white"
      : variant === "pill"
        ? "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-300 hover:border-brand-purple/30 hover:text-white"
        : variant === "icon"
          ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 hover:border-brand-purple/30 hover:text-white"
          : "inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white",
    className,
  );

  return (
    <>
      <button
        type="button"
        onClick={openComposer}
        className={buttonClassName}
        data-breadcrumb-label={`report-bug-${context}`}
        aria-label={variant === "icon" ? label : undefined}
      >
        <Bug className="h-3.5 w-3.5" />
        {variant === "icon" ? null : label}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-md">
          <div
            className="absolute inset-0"
            onClick={() => closeComposer()}
            aria-hidden="true"
          />

          <div className="relative z-10 flex h-full items-end justify-center p-0 md:items-center md:p-4 pointer-events-none">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Bug report"
              className="glass-panel pointer-events-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-zinc-950/95 px-4 pb-4 pt-3 md:max-h-[min(42rem,88dvh)] md:rounded-[1.75rem] md:px-5 md:pb-5 md:pt-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex justify-center md:hidden">
                <span className="h-1.5 w-12 rounded-full bg-white/15" />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-purple">
                    Bug Report
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-white md:text-xl">Share what broke</h2>
                  <p className="mt-1 text-xs leading-5 text-gray-400 md:text-sm">
                    {autoContextEnabled
                      ? "Logs and screen context are attached automatically."
                      : "We attach the current screen context automatically."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    closeComposer();
                  }}
                  className="relative z-50 rounded-full border border-white/10 bg-white/5 p-3 text-gray-400 transition-colors hover:text-white"
                  aria-label="Close bug report"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>



              <div className="mt-4 space-y-3">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500 md:text-[11px]">
                    What happened?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {BUG_REPORT_ISSUE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setIssueType(option.value)}
                        className={cn(
                          "rounded-[1rem] border px-3 py-2.5 text-left text-[11px] transition-colors md:text-xs",
                          issueType === option.value
                            ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                            : "border-white/10 bg-white/5 text-gray-300 hover:border-brand-purple/30",
                        )}
                      >
                        <div className="font-semibold leading-4">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>



                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500 md:text-[11px]">
                    Optional detail
                  </label>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    className="min-h-[5.5rem] w-full rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple"
                    placeholder="Optional: tell us what you tapped or expected."
                  />
                </div>

                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-3">
                  <button
                    type="button"
                    onClick={() => setShowAutoContext((current) => !current)}
                    aria-expanded={showAutoContext}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">Auto-captured context</p>
                      <p className="mt-1 text-[11px] leading-5 text-gray-400">
                        {snapshotPreview.diagnostics.length} diagnostics, {snapshotPreview.breadcrumbs.length} actions, {snapshotPreview.recentErrors.length} errors
                      </p>
                    </div>
                    {showAutoContext ? <ChevronUp className="h-4 w-4 text-brand-purple" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 text-brand-purple" aria-hidden="true" />}
                  </button>

                  {showAutoContext ? (
                    <div className="mt-3 space-y-3 text-xs text-gray-300">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                          <p className="font-semibold text-white">Route</p>
                          <p className="mt-1 break-all text-gray-400">
                            {snapshotPreview.currentPath}{snapshotPreview.currentSearch}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                          <p className="font-semibold text-white">Viewport</p>
                          <p className="mt-1 text-gray-400">
                            {snapshotPreview.viewportWidth} x {snapshotPreview.viewportHeight}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                        <p className="font-semibold text-white">Component source</p>
                        <p className="mt-1 text-gray-400">{componentMeta.sourcePath || "No mapped source path"}</p>
                        {componentMeta.codeSnippet ? (
                          <pre className="mt-2 overflow-x-auto rounded-lg bg-black/40 p-3 text-[11px] text-brand-purple">
                            {componentMeta.codeSnippet}
                          </pre>
                        ) : null}
                      </div>
                      {snapshotPreview.rolloutAssignments.length > 0 ? (
                        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                          <p className="font-semibold text-white">Rollout assignments</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {snapshotPreview.rolloutAssignments.map((assignment) => (
                              <span
                                key={`${assignment.id}:${assignment.variant}`}
                                className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-gray-300"
                              >
                                {assignment.id}: {assignment.variant}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex gap-3 border-t border-white/10 pt-4">

                <button
                  type="button"
                  onClick={submitBugReport}
                  disabled={submitting}
                  aria-busy={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-brand-purple bg-brand-purple px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <><Sparkles className="h-4 w-4" aria-hidden="true" />Send report</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
