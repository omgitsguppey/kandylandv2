import type { ClientComponentSnapshot } from "@/lib/client-diagnostics";

export const BUG_REPORT_ISSUE_TYPES = [
  "action_failed",
  "wrong_data",
  "broken_ui",
  "performance",
  "permissions",
  "other",
] as const;

export type BugReportIssueType = typeof BUG_REPORT_ISSUE_TYPES[number];
export type BugReportSeverity = "low" | "medium" | "high";

export interface BugReportIssueOption {
  value: BugReportIssueType;
  label: string;
  description: string;
}

export interface BugReportComponentMeta extends ClientComponentSnapshot {
  title: string;
}

const BUG_REPORT_CONTEXT_REGISTRY: Record<string, BugReportComponentMeta> = {
  "daily-tasks-empty": {
    contextId: "daily-tasks-empty",
    title: "Daily tasks empty state",
    componentName: "DailyTasksModule",
    sourcePath: "src/components/Dashboard/DailyTasksModule.tsx",
    routeHint: "/dashboard",
    codeSnippet: "<ReportBugButton context=\"daily-tasks-empty\" />",
  },
  "daily-tasks-complete": {
    contextId: "daily-tasks-complete",
    title: "Daily tasks completion state",
    componentName: "DailyTasksModule",
    sourcePath: "src/components/Dashboard/DailyTasksModule.tsx",
    routeHint: "/dashboard",
    codeSnippet: "<ReportBugButton context=\"daily-tasks-complete\" />",
  },
  "recent-activity-empty": {
    contextId: "recent-activity-empty",
    title: "Recent activity empty state",
    componentName: "RecentActivityFeed",
    sourcePath: "src/components/Dashboard/RecentActivityFeed.tsx",
    routeHint: "/dashboard",
    codeSnippet: "<ReportBugButton context=\"recent-activity-empty\" />",
  },
  "drop-preview-locked": {
    contextId: "drop-preview-locked",
    title: "Locked drop preview",
    componentName: "DropPreviewModal",
    sourcePath: "src/components/DropPreviewModal.tsx",
    routeHint: "/drops",
    codeSnippet: "<ReportBugButton context=\"drop-preview-locked\" />",
  },
  "drop-preview-unlocked": {
    contextId: "drop-preview-unlocked",
    title: "Unlocked drop preview",
    componentName: "DropPreviewModal",
    sourcePath: "src/components/DropPreviewModal.tsx",
    routeHint: "/drops",
    codeSnippet: "<ReportBugButton context=\"drop-preview-unlocked\" />",
  },
  "wallet-success": {
    contextId: "wallet-success",
    title: "Wallet success state",
    componentName: "PurchaseModal",
    sourcePath: "src/components/PurchaseModal.tsx",
    routeHint: "/dashboard",
    codeSnippet: "<ReportBugButton context=\"wallet-success\" />",
  },
  "error-boundary": {
    contextId: "error-boundary",
    title: "Global error boundary",
    componentName: "ErrorBoundary",
    sourcePath: "src/components/ErrorBoundary.tsx",
    routeHint: "/",
    codeSnippet: "<ErrorBoundary />",
  },
};

export const BUG_REPORT_ISSUE_OPTIONS: BugReportIssueOption[] = [
  { value: "action_failed", label: "Action failed", description: "A button or flow did not complete." },
  { value: "wrong_data", label: "Wrong data", description: "Counts, lists, or content looked off." },
  { value: "broken_ui", label: "Broken UI", description: "Layout, spacing, or visuals broke." },
  { value: "performance", label: "Slow or stuck", description: "The page lagged, stalled, or kept loading." },
  { value: "permissions", label: "Permissions", description: "Something was blocked or routed incorrectly." },
  { value: "other", label: "Other", description: "Anything else that felt wrong." },
];

export function resolveBugReportComponentMeta(
  contextId: string,
  pathname?: string,
): BugReportComponentMeta {
  if (BUG_REPORT_CONTEXT_REGISTRY[contextId]) {
    return BUG_REPORT_CONTEXT_REGISTRY[contextId];
  }

  if (contextId.startsWith("global:")) {
    const routeHint = pathname || contextId.replace(/^global:/, "") || "/";
    return {
      contextId,
      title: `Global bug trigger for ${routeHint}`,
      componentName: "GlobalBugReportTrigger",
      sourcePath: "src/components/Feedback/GlobalBugReportTrigger.tsx",
      routeHint,
      codeSnippet: "<GlobalBugReportTrigger />",
    };
  }

  return {
    contextId,
    title: `Bug report for ${contextId}`,
    componentName: "UnknownSurface",
    sourcePath: undefined,
    routeHint: pathname || "/",
    codeSnippet: undefined,
  };
}

export function buildBugReportSummary(input: {
  issueType: BugReportIssueType;
  severity: BugReportSeverity;
  component: BugReportComponentMeta;
  pathname: string;
  note?: string;
}) {
  const baseSummary = `[${input.issueType}] ${input.component.title} on ${input.pathname} (${input.severity})`;
  if (!input.note?.trim()) {
    return baseSummary;
  }

  return `${baseSummary} - ${input.note.trim().slice(0, 240)}`;
}
