"use client";

import {
  Activity, ArrowDownLeft, ArrowUpRight, CheckCircle2, ChevronDown, ChevronLeft,
  ChevronRight, ChevronUp, Loader2, Search, TriangleAlert,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/Button";
import { ContentSection, SectionHeader, GroupedList, GroupedRow } from "@/components/ui/content-layout";
import { Input } from "@/components/ui/input";
import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import type { ActivityItem } from "@/components/Dashboard/RecentActivityFeed";
import { getTransactionDisplayLabel } from "@/lib/transaction-normalizers";
import type { Transaction } from "@/types/db";

type KandyRecentActivityExperienceProps = {
  expanded: boolean;
  onToggleExpanded: () => void;
  loadingSummary: boolean;
  summaryError: boolean;
  onRetry: () => void;
  hasRecordedActivity: boolean;
  summaryActivity: ActivityItem | null;
  activities: ActivityItem[];
  currentPage: number;
  historyError: boolean;
  loadingHistory: boolean;
  searchValue: string;
  totalPages: number;
  onSearchChange: (value: string) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onUnwrapNow: () => void;
  onOpenExperiences: () => void;
};

const POSITIVE_TRANSACTION_TYPES = new Set<Transaction["type"]>([
  "purchase_currency", "daily_reward", "admin_adjustment", "referral_bonus", "onboarding_reward",
]);

function relativeTime(timestamp: number) {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

function taskEventLabel(item: Extract<ActivityItem, { kind: "task" }>) {
  const taskEvent = item.taskEvent;
  if (taskEvent.type === "assigned") return "Task ready: " + taskEvent.title;
  if (taskEvent.type === "started") return "Task in progress: " + taskEvent.title;
  if (taskEvent.type === "completed") return "Task complete: " + taskEvent.title;
  if (taskEvent.type === "failed") return "Task reset: " + taskEvent.title;
  return "Task reminder: " + taskEvent.title;
}

function ActivityRow({ item }: { item: ActivityItem }) {
  if (item.kind === "transaction") {
    const positive = POSITIVE_TRANSACTION_TYPES.has(item.transaction.type);
    const title = item.label || getTransactionDisplayLabel(item.transaction);
    return (
      <GroupedRow>
        <div className="flex min-w-0 flex-[1_1_14rem] items-start gap-3">
          {positive ? <ArrowDownLeft className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          <div className="min-w-0">
            <p className="break-words text-sm font-medium text-foreground">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{relativeTime(item.timestamp)}</p>
          </div>
        </div>
        <p className="break-words text-sm font-semibold tabular-nums text-foreground">{positive ? "+" : "-"}{item.transaction.amount} GD</p>
      </GroupedRow>
    );
  }

  const completed = item.taskEvent.type === "completed";
  const failed = item.taskEvent.type === "failed";
  const neutral = !completed && !failed;
  const statusLabel = item.taskEvent.type === "assigned"
    ? "Ready"
    : item.taskEvent.type === "started"
      ? item.taskEvent.progress + "/" + (item.taskEvent.maxProgress || 1)
      : item.taskEvent.type === "reminder_sent"
        ? "Reminder"
        : failed ? "Reset" : "+" + item.taskEvent.reward + " GD";
  return (
    <GroupedRow>
      <div className="flex min-w-0 flex-[1_1_14rem] items-start gap-3">
        {completed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : neutral ? <Activity className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-foreground">{item.label || taskEventLabel(item)}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{relativeTime(item.timestamp)}</p>
        </div>
      </div>
      <p className="break-words text-sm font-semibold tabular-nums text-foreground">{statusLabel}</p>
    </GroupedRow>
  );
}

function EmptyActivityState({ onOpenExperiences, onUnwrapNow }: Pick<KandyRecentActivityExperienceProps, "onOpenExperiences" | "onUnwrapNow">) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">No recent activity</h3>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">Your recent unlocks, GumDrop changes, and task history will appear here.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="brand" onClick={onUnwrapNow} className="min-w-0 whitespace-normal">Unwrap now</Button>
        <Button variant="ghost" onClick={onOpenExperiences} className="min-w-0 whitespace-normal">Open Experiences</Button>
      </div>
      <ReportBugButton context="recent-activity-empty" />
    </div>
  );
}

function ActivityHistory({ activities, currentPage, historyError, loadingHistory, onNextPage, onPreviousPage, onRetry, onSearchChange, searchValue, totalPages }: Pick<KandyRecentActivityExperienceProps, "activities" | "currentPage" | "historyError" | "loadingHistory" | "onNextPage" | "onPreviousPage" | "onRetry" | "onSearchChange" | "searchValue" | "totalPages">) {
  return (
    <div id="recent-activity-history" className="min-w-0 space-y-4">
      <label className="block min-w-0 space-y-2">
        <span className="block text-sm font-medium text-foreground">Search activity</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" value={searchValue} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search activity" className="pl-10" />
        </div>
      </label>
      <div className="flex flex-wrap justify-between gap-2 text-xs leading-relaxed text-muted-foreground">
        <span>{loadingHistory ? "Loading history" : historyError && activities.length === 0 ? "Results unavailable" : activities.length + " on this page"}</span>
        <span>5 per page</span>
      </div>

      {historyError && (
        <div className="space-y-3">
          <p role="alert" className="text-sm leading-relaxed text-destructive">We couldn&apos;t load your full history right now.{activities.length > 0 ? " Your last loaded activity is still shown." : ""}</p>
          <Button variant="ghost" size="sm" onClick={onRetry} className="min-w-11 whitespace-normal">Try again</Button>
        </div>
      )}
      {loadingHistory ? (
        <div className="flex min-h-40 items-center justify-center" role="status"><Loader2 className="size-6 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" /><span className="sr-only">Loading activity</span></div>
      ) : historyError && activities.length === 0 ? null : activities.length === 0 ? (
        <p className="py-4 text-sm leading-relaxed text-muted-foreground">{searchValue.trim() ? "No activity matches your search yet." : "No activity has been recorded yet."}</p>
      ) : (
        <>
          <GroupedList aria-label="Activity history">{activities.map((activity) => <ActivityRow key={activity.id} item={activity} />)}</GroupedList>
          <nav className="flex min-w-0 flex-wrap items-center justify-between gap-2" aria-label="Activity pages">
            <Button variant="ghost" size="sm" onClick={onPreviousPage} disabled={currentPage === 1} className="min-w-0 gap-2 whitespace-normal"><ChevronLeft className="size-4 shrink-0" aria-hidden="true" />Previous</Button>
            <span className="text-xs leading-relaxed text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="ghost" size="sm" onClick={onNextPage} disabled={currentPage >= totalPages} className="min-w-0 gap-2 whitespace-normal">Next<ChevronRight className="size-4 shrink-0" aria-hidden="true" /></Button>
          </nav>
        </>
      )}
    </div>
  );
}

export function KandyRecentActivityExperience({ expanded, onToggleExpanded, loadingSummary, summaryError, onRetry, hasRecordedActivity, summaryActivity, activities, currentPage, historyError, loadingHistory, searchValue, totalPages, onSearchChange, onNextPage, onPreviousPage, onUnwrapNow, onOpenExperiences }: KandyRecentActivityExperienceProps) {
  return (
    <ContentSection className="space-y-5" data-mobile-residual-cleanup="score-impact" aria-labelledby="recent-activity-title">
      <SectionHeader title="Recent activity" headingId="recent-activity-title" accessory={(
        <Button variant="ghost" size="sm" onClick={onToggleExpanded} aria-expanded={expanded} aria-controls="recent-activity-content" className="min-w-0 gap-2 whitespace-normal">
          {expanded ? "Collapse" : "View all"}
          {expanded ? <ChevronUp className="size-4 shrink-0" aria-hidden="true" /> : <ChevronDown className="size-4 shrink-0" aria-hidden="true" />}
        </Button>
      )} />
      <div id="recent-activity-content" className="min-w-0">
        {summaryError && !expanded && (
          <div className="space-y-3 pb-4">
            <p role="alert" className="text-sm leading-relaxed text-destructive">{hasRecordedActivity ? "We couldn't refresh recent activity. Your last loaded activity is still shown." : "Recent activity is unavailable right now."}</p>
            <Button variant="ghost" size="sm" onClick={onRetry} className="min-w-11 whitespace-normal">Try again</Button>
          </div>
        )}
        {expanded ? (
          <ActivityHistory activities={activities} currentPage={currentPage} historyError={historyError} loadingHistory={loadingHistory} onNextPage={onNextPage} onPreviousPage={onPreviousPage} onRetry={onRetry} onSearchChange={onSearchChange} searchValue={searchValue} totalPages={totalPages} />
        ) : loadingSummary ? (
          <div className="flex min-h-40 items-center justify-center" role="status"><Loader2 className="size-6 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" /><span className="sr-only">Loading recent activity</span></div>
        ) : !hasRecordedActivity ? (
          summaryError ? null : <EmptyActivityState onUnwrapNow={onUnwrapNow} onOpenExperiences={onOpenExperiences} />
        ) : summaryActivity ? <GroupedList aria-label="Latest activity"><ActivityRow item={summaryActivity} /></GroupedList> : null}
      </div>
    </ContentSection>
  );
}
