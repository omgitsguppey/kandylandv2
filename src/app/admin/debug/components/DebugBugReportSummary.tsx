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
      tone === "good" ? "border-success/20 bg-success/10" : tone === "warn" ? "border-warning/20 bg-warning/10" : "border-border bg-secondary",
    )}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
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
      className={cn("rounded-[1.2rem] border border-border bg-background/25 p-3", className)}
      data-debug-bug-report-summary
      data-debug-report-source="bug_reports"
      data-debug-truth-state={truthState}
      data-debug-read-only="true"
      data-debug-redaction-status={terminalTruth.redactionStatus}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15">
            <Bug className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Bug report truth</h3>
            <p className="text-xs leading-5 text-muted-foreground">
              Read-only translated error reports, reward states, and operator messages.
            </p>
          </div>
        </div>
        <AdminTruthBadge state={badgeState} />
      </div>

      {loading && !truth ? (
        <div className="mt-3 rounded-xl border border-border bg-secondary p-3 text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Loading bug report truth.
        </div>
      ) : null}

      {!loading || truth ? (
        <div className="mt-3 rounded-xl border border-border bg-secondary p-3 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">{terminalTruth.nextAction}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Source {terminalTruth.sourcePath} | {terminalTruth.sourceWindow?.label || "no source window"} | {terminalTruth.redactionStatus}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
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
            <div className="rounded-2xl border border-border bg-secondary p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ShieldX className="h-3.5 w-3.5" />
                Top error keys
              </div>
              <div className="space-y-1.5">
                {summary.topErrorKeys.length > 0 ? summary.topErrorKeys.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-foreground">{item.key}</span>
                    <span className="font-semibold text-foreground">{item.count}</span>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No reports loaded.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-secondary p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Top surfaces
              </div>
              <div className="space-y-1.5">
                {summary.topSurfaces.length > 0 ? summary.topSurfaces.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-foreground">{item.key}</span>
                    <span className="font-semibold text-foreground">{item.count}</span>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No reports loaded.</p>}
              </div>
            </div>
          </div> : null}

          {summary && summary.latestReports.length > 0 ? <div className="mt-3 space-y-2">
            {summary.latestReports.slice(0, 8).map((report) => (
              <article key={report.id} className="rounded-2xl border border-border bg-secondary p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{report.userTitle}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Report body redacted by default. Open the drilldown-only support record for private details.</p>
                  </div>
                  <span className="rounded-full border border-border bg-background/25 px-2.5 py-1 text-[11px] text-muted-foreground">
                    {report.status}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Operator message body hidden in this summary surface.</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full border border-border bg-background/25 px-2 py-1">{report.errorKey}</span>
                  <span className="rounded-full border border-border bg-background/25 px-2 py-1">{report.surface}</span>
                  <span className="rounded-full border border-border bg-background/25 px-2 py-1">{report.route}</span>
                  {report.debugId ? <span className="rounded-full border border-border bg-background/25 px-2 py-1">debug {report.debugId}</span> : null}
                  {report.rewardGd > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2 py-1 text-success">
                      <Gift className="h-3 w-3" />
                      {report.rewardGd} reward GD
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div> : reportCount === 0 ? (
            <div className="mt-3 rounded-xl border border-border bg-secondary p-3 text-sm text-muted-foreground">
              Bug Report Truth resolved to an empty terminal state for the loaded source window.
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
