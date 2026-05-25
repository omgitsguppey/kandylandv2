"use client";

import { useEffect, useState } from "react";
import { Bug, Gift, Loader2, ShieldCheck, ShieldX } from "lucide-react";

import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import type { BugReportTruthState } from "@/lib/debug/bug-report-truth-contract";
import type { BugReportAdminSummary } from "@/lib/errors/bug-report-admin-summary";
import { cn } from "@/lib/utils";

type DebugBugReportSummaryProps = {
  summary?: BugReportAdminSummary | null;
  className?: string;
};

function Metric({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "good" | "warn" }) {
  return (
    <div className={cn(
      "rounded-2xl border p-3",
      tone === "good" ? "border-emerald-400/20 bg-emerald-500/10" : tone === "warn" ? "border-amber-400/20 bg-amber-500/10" : "border-white/10 bg-white/[0.04]",
    )}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

const TERMINAL_EMPTY_TRUTH: BugReportTruthState = {
  status: "source_ready_no_sample_loaded",
  reportCount: 0,
  recentCount: 0,
  olderBacklogCount: 0,
  needsTriageCount: 0,
  rewardStateCount: 0,
  operatorMessageCount: 0,
  translatedErrorCount: 0,
  sourceWindow: null,
  generatedAtMs: null,
  loadError: null,
  sourcePath: "/api/admin/debug/bug-reports",
  redactionStatus: "not_loaded",
  nextAction: "Load the bounded bug report sample before treating loaded=0 as healthy.",
};

function badgeStateForTruth(status: BugReportTruthState["status"]) {
  if (status === "loaded_with_reports" || status === "loaded_empty") return "live" as const;
  if (status === "failed" || status === "source_missing_actionable" || status === "blocked_by_permissions") return "failed" as const;
  if (status === "stale") return "stale" as const;
  return "unavailable" as const;
}

export function DebugBugReportSummary({ summary: providedSummary, className }: DebugBugReportSummaryProps) {
  const [summary, setSummary] = useState<BugReportAdminSummary | null>(providedSummary ?? null);
  const [truth, setTruth] = useState<BugReportTruthState | null>(providedSummary ? {
    ...TERMINAL_EMPTY_TRUTH,
    status: providedSummary.totalReports > 0 ? "loaded_with_reports" : "loaded_empty",
    reportCount: providedSummary.totalReports,
    rewardStateCount: providedSummary.rewardedCount,
    generatedAtMs: Date.parse(providedSummary.generatedAtUtc),
    redactionStatus: "summary_only_raw_bodies_redacted",
    nextAction: providedSummary.totalReports > 0
      ? "Review bug report summary counts and triage current report clusters from the drilldown."
      : "No bug reports were found in the loaded source window.",
  } : null);
  const [loading, setLoading] = useState(!providedSummary);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (providedSummary) {
      setSummary(providedSummary);
      setTruth({
        ...TERMINAL_EMPTY_TRUTH,
        status: providedSummary.totalReports > 0 ? "loaded_with_reports" : "loaded_empty",
        reportCount: providedSummary.totalReports,
        rewardStateCount: providedSummary.rewardedCount,
        generatedAtMs: Date.parse(providedSummary.generatedAtUtc),
        redactionStatus: "summary_only_raw_bodies_redacted",
        nextAction: providedSummary.totalReports > 0
          ? "Review bug report summary counts and triage current report clusters from the drilldown."
          : "No bug reports were found in the loaded source window.",
      });
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadSummary() {
      setLoading(true);
      setError(null);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15_000);
      try {
        const response = await authFetch("/api/admin/debug/bug-reports", { signal: controller.signal });
        const payload = await response.json() as { summary?: BugReportAdminSummary | null; truth?: BugReportTruthState; error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Bug report truth could not be loaded.");
        }
        if (!cancelled) {
          setSummary(payload.summary ?? null);
          setTruth(payload.truth ?? {
            ...TERMINAL_EMPTY_TRUTH,
            status: "source_ready_no_sample_loaded",
            generatedAtMs: Date.now(),
          });
        }
      } catch (issue) {
        if (!cancelled) {
          setError("Bug report truth could not be loaded.");
          setTruth({
            ...TERMINAL_EMPTY_TRUTH,
            status: "failed",
            loadError: "Bug report truth route failed. Inspect admin/debug/bug-reports route diagnostics.",
            generatedAtMs: Date.now(),
            nextAction: "Inspect admin/debug/bug-reports route diagnostics; the UI has resolved to a safe failed state.",
          });
        }
        reportClientIssue({
          channel: "runtime",
          severity: "warn",
          message: "Admin debug bug report truth load failed",
          error: issue,
          detail: {
            route: "/api/admin/debug/bug-reports",
            component: "DebugBugReportSummary",
          },
          consoleLabel: "[Admin Debug] bug report truth load failed",
        });
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [providedSummary]);

  const terminalTruth = truth ?? TERMINAL_EMPTY_TRUTH;
  const truthState = loading && !truth ? "loading" : terminalTruth.status;
  const badgeState = badgeStateForTruth(terminalTruth.status);
  const reportCount = terminalTruth.reportCount || summary?.totalReports || 0;

  return (
    <section
      className={cn("rounded-[1.2rem] border border-white/10 bg-black/25 p-3", className)}
      data-debug-bug-report-summary
      data-debug-report-source="bug_reports"
      data-debug-truth-state={truthState}
      data-debug-read-only="true"
      data-debug-redaction-status={terminalTruth.redactionStatus}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand-purple/30 bg-brand-purple/15">
            <Bug className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">Bug report truth</h3>
            <p className="text-xs leading-5 text-gray-400">
              Read-only translated error reports, reward states, and operator messages.
            </p>
          </div>
        </div>
        <AdminTruthBadge state={badgeState} />
      </div>

      {loading && !truth ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-gray-300">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Loading bug report truth.
        </div>
      ) : null}

      {!loading || truth ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-gray-300">
          <p className="font-semibold text-white">{terminalTruth.nextAction}</p>
          <p className="mt-1 text-xs text-gray-500">
            Source {terminalTruth.sourcePath} | {terminalTruth.sourceWindow?.label || "no source window"} | {terminalTruth.redactionStatus}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {summary || truth ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Reports" value={reportCount} />
            <Metric label="Reward states" value={terminalTruth.rewardStateCount || summary?.rewardedCount || 0} tone="good" />
            <Metric label="Needs triage" value={terminalTruth.needsTriageCount} tone={terminalTruth.needsTriageCount > 0 ? "warn" : "neutral"} />
            <Metric label="Operator msgs" value={terminalTruth.operatorMessageCount} tone="neutral" />
          </div>

          {summary ? <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                <ShieldX className="h-3.5 w-3.5" />
                Top error keys
              </div>
              <div className="space-y-1.5">
                {summary.topErrorKeys.length > 0 ? summary.topErrorKeys.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-gray-200">{item.key}</span>
                    <span className="font-bold text-white">{item.count}</span>
                  </div>
                )) : <p className="text-sm text-gray-400">No reports loaded.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Top surfaces
              </div>
              <div className="space-y-1.5">
                {summary.topSurfaces.length > 0 ? summary.topSurfaces.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-gray-200">{item.key}</span>
                    <span className="font-bold text-white">{item.count}</span>
                  </div>
                )) : <p className="text-sm text-gray-400">No reports loaded.</p>}
              </div>
            </div>
          </div> : null}

          {summary && summary.latestReports.length > 0 ? <div className="mt-3 space-y-2">
            {summary.latestReports.slice(0, 8).map((report) => (
              <article key={report.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{report.userTitle}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-300">Report body redacted by default. Open the drilldown-only support record for private details.</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-gray-300">
                    {report.status}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-gray-400">Operator message body hidden in this summary surface.</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-300">
                  <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1">{report.errorKey}</span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1">{report.surface}</span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1">{report.route}</span>
                  {report.debugId ? <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1">debug {report.debugId}</span> : null}
                  {report.rewardGd > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-emerald-100">
                      <Gift className="h-3 w-3" />
                      {report.rewardGd} reward GD
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div> : reportCount === 0 ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-gray-300">
              Bug Report Truth resolved to an empty terminal state for the loaded source window.
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
