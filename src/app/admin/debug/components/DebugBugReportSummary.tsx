"use client";

import { useEffect, useState } from "react";
import { Bug, Gift, Loader2, ShieldCheck, ShieldX } from "lucide-react";

import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
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

export function DebugBugReportSummary({ summary: providedSummary, className }: DebugBugReportSummaryProps) {
  const [summary, setSummary] = useState<BugReportAdminSummary | null>(providedSummary ?? null);
  const [loading, setLoading] = useState(!providedSummary);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (providedSummary) {
      setSummary(providedSummary);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadSummary() {
      setLoading(true);
      setError(null);
      try {
        const response = await authFetch("/api/admin/debug/bug-reports");
        const payload = await response.json() as { summary?: BugReportAdminSummary; error?: string };
        if (!response.ok || !payload.summary) {
          throw new Error(payload.error || "Bug report truth could not be loaded.");
        }
        if (!cancelled) {
          setSummary(payload.summary);
        }
      } catch (issue) {
        if (!cancelled) {
          setError("Bug report truth could not be loaded.");
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

  const truthState = loading ? "unknown" : error ? "failed" : summary ? "live" : "unavailable";
  const badgeState = truthState === "unknown" ? "unavailable" : truthState;

  return (
    <section
      className={cn("rounded-[1.2rem] border border-white/10 bg-black/25 p-3", className)}
      data-debug-bug-report-summary
      data-debug-report-source="bug_reports"
      data-debug-truth-state={truthState}
      data-debug-read-only="true"
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

      {loading ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-gray-300">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Loading bug report truth.
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Reports" value={summary.totalReports} />
            <Metric label="Rewarded" value={summary.rewardedCount} tone="good" />
            <Metric label="Duplicate" value={summary.duplicateCount} tone="warn" />
            <Metric label="Cap reached" value={summary.capReachedCount} tone="warn" />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
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
          </div>

          <div className="mt-3 space-y-2">
            {summary.latestReports.slice(0, 8).map((report) => (
              <article key={report.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{report.userTitle}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-300">{report.userMessage}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-gray-300">
                    {report.status}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-gray-400">{report.operatorMessage}</p>
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
          </div>
        </>
      ) : null}
    </section>
  );
}
