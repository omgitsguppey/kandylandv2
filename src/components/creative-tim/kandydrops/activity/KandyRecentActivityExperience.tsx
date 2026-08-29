"use client";

import {
    Activity,
    ArrowDownLeft,
    ArrowUpRight,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Loader2,
    Search,
    TriangleAlert,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import type { ActivityItem } from "@/components/Dashboard/RecentActivityFeed";
import { getTransactionDisplayLabel } from "@/lib/transaction-normalizers";
import type { Transaction } from "@/types/db";

type KandyRecentActivityExperienceProps = {
    expanded: boolean;
    onToggleExpanded: () => void;
    loadingSummary: boolean;
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
    "purchase_currency",
    "daily_reward",
    "admin_adjustment",
    "referral_bonus",
    "onboarding_reward",
]);

function relativeTime(timestamp: number) {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

function taskEventLabel(item: Extract<ActivityItem, { kind: "task" }>) {
    const taskEvent = item.taskEvent;

    if (taskEvent.type === "assigned") {
        return "Task ready: " + taskEvent.title;
    }

    if (taskEvent.type === "started") {
        return "Task in progress: " + taskEvent.title;
    }

    if (taskEvent.type === "completed") {
        return "Task complete: " + taskEvent.title;
    }

    if (taskEvent.type === "failed") {
        return "Task reset: " + taskEvent.title;
    }

    return "Task reminder: " + taskEvent.title;
}

function ActivityRow({ item, featured = false }: { item: ActivityItem; featured?: boolean }) {
    if (item.kind === "transaction") {
        const positive = POSITIVE_TRANSACTION_TYPES.has(item.transaction.type);
        const title = item.label || getTransactionDisplayLabel(item.transaction);

        return (
            <article className={featured
                ? "rounded-3xl border border-pink-200/20 bg-[linear-gradient(145deg,rgba(236,72,153,0.16),rgba(139,92,246,0.16))] p-4 shadow-[0_16px_32px_rgba(24,4,55,0.18)]"
                : "rounded-2xl border border-white/10 bg-white/[0.045] p-3.5 transition hover:border-pink-200/20 hover:bg-white/[0.075]"}>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className={positive
                            ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-pink-200/20 bg-pink-400/15 text-pink-100"
                            : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-purple-100"}>
                            {positive ? <ArrowDownLeft className="h-5 w-5" aria-hidden="true" /> : <ArrowUpRight className="h-5 w-5" aria-hidden="true" />}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{title}</p>
                            <p className="mt-1 text-xs text-purple-100/58">{relativeTime(item.timestamp)}</p>
                        </div>
                    </div>
                    <p className={positive
                        ? "shrink-0 text-sm font-bold text-pink-100"
                        : "shrink-0 text-sm font-bold text-purple-100"}>
                        {positive ? "+" : "-"}{item.transaction.amount} GD
                    </p>
                </div>
            </article>
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
                : failed
                    ? "Reset"
                    : "+" + item.taskEvent.reward + " GD";

    return (
        <article className={featured
            ? "rounded-3xl border border-pink-200/20 bg-[linear-gradient(145deg,rgba(236,72,153,0.16),rgba(139,92,246,0.16))] p-4 shadow-[0_16px_32px_rgba(24,4,55,0.18)]"
            : "rounded-2xl border border-white/10 bg-white/[0.045] p-3.5 transition hover:border-pink-200/20 hover:bg-white/[0.075]"}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className={completed
                        ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-pink-200/20 bg-pink-400/15 text-pink-100"
                        : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-purple-100"}>
                        {completed
                            ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                            : neutral
                                ? <Activity className="h-5 w-5" aria-hidden="true" />
                                : <TriangleAlert className="h-5 w-5" aria-hidden="true" />}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{item.label || taskEventLabel(item)}</p>
                        <p className="mt-1 text-xs text-purple-100/58">{relativeTime(item.timestamp)}</p>
                    </div>
                </div>
                <p className={completed
                    ? "shrink-0 text-sm font-bold text-pink-100"
                    : "shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-purple-100/72"}>
                    {statusLabel}
                </p>
            </div>
        </article>
    );
}

function EmptyActivityState({
    onOpenExperiences,
    onUnwrapNow,
}: Pick<KandyRecentActivityExperienceProps, "onOpenExperiences" | "onUnwrapNow">) {
    return (
        <div className="rounded-3xl border border-dashed border-pink-200/20 bg-pink-400/[0.045] px-5 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-200/20 bg-pink-400/10 text-pink-100">
                <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="mt-4 text-base font-semibold text-white">Your account pulse starts with a Drop.</h4>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-purple-100/68">
                Your recent unlocks, GumDrop changes, and task history will appear here.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={onUnwrapNow}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-pink-300 px-4 text-sm font-bold text-purple-950 shadow-[0_12px_26px_rgba(236,72,153,0.22)] transition hover:bg-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:ring-offset-2 focus:ring-offset-purple-950"
                >
                    Unwrap now
                </button>
                <button
                    type="button"
                    onClick={onOpenExperiences}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.055] px-4 text-sm font-semibold text-purple-50 transition hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-pink-200/60"
                >
                    Open Experiences
                </button>
            </div>
            <div className="mt-4 flex justify-center">
                <ReportBugButton context="recent-activity-empty" />
            </div>
        </div>
    );
}

function ActivityHistory({
    activities,
    currentPage,
    historyError,
    loadingHistory,
    onNextPage,
    onPreviousPage,
    onSearchChange,
    searchValue,
    totalPages,
}: Pick<
    KandyRecentActivityExperienceProps,
    | "activities"
    | "currentPage"
    | "historyError"
    | "loadingHistory"
    | "onNextPage"
    | "onPreviousPage"
    | "onSearchChange"
    | "searchValue"
    | "totalPages"
>) {
    return (
        <div id="recent-activity-history" className="space-y-4">
            <label className="relative block">
                <span className="sr-only">Search activity</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-100/55" aria-hidden="true" />
                <input
                    type="search"
                    value={searchValue}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Search activity"
                    className="min-h-11 w-full rounded-2xl border border-white/12 bg-[#180329]/72 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-purple-100/40 focus:border-pink-200/65 focus:ring-2 focus:ring-pink-300/20"
                />
            </label>

            <div className="flex items-center justify-between gap-3 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-purple-100/54">
                <span>{activities.length} result{activities.length === 1 ? "" : "s"}</span>
                <span>5 per page</span>
            </div>

            {loadingHistory ? (
                <div className="flex min-h-40 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-pink-200" aria-hidden="true" />
                </div>
            ) : historyError && activities.length === 0 ? (
                <div role="alert" className="rounded-3xl border border-rose-200/22 bg-rose-400/10 px-5 py-8 text-center text-sm leading-6 text-rose-100">
                    <TriangleAlert className="mx-auto mb-3 h-6 w-6" aria-hidden="true" />
                    We couldn&apos;t load your full history right now.
                </div>
            ) : activities.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.035] px-5 py-8 text-center text-sm leading-6 text-purple-100/68">
                    {searchValue.trim() ? "No activity matches your search yet." : "No activity has been recorded yet."}
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {activities.map((activity) => <ActivityRow key={activity.id} item={activity} />)}
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onPreviousPage}
                            disabled={currentPage === 1}
                            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.055] px-3 text-sm font-semibold text-white transition hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-pink-200/60 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                            Previous
                        </button>
                        <span className="text-xs font-semibold text-purple-100/62">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={onNextPage}
                            disabled={currentPage >= totalPages}
                            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.055] px-3 text-sm font-semibold text-white transition hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-pink-200/60 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export function KandyRecentActivityExperience({
    expanded,
    onToggleExpanded,
    loadingSummary,
    hasRecordedActivity,
    summaryActivity,
    activities,
    currentPage,
    historyError,
    loadingHistory,
    searchValue,
    totalPages,
    onSearchChange,
    onNextPage,
    onPreviousPage,
    onUnwrapNow,
    onOpenExperiences,
}: KandyRecentActivityExperienceProps) {
    return (
        <section
            className="relative mt-4 overflow-hidden rounded-[2rem] border border-pink-100/14 bg-[linear-gradient(150deg,rgba(58,14,90,0.9),rgba(28,6,56,0.94))] shadow-[0_24px_60px_rgba(14,2,37,0.28)] lg:mt-8"
            data-mobile-residual-cleanup="score-impact"
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_12%_0%,rgba(236,72,153,0.21),transparent_42%),radial-gradient(circle_at_82%_4%,rgba(168,85,247,0.2),transparent_36%)]"
            />
            <div className="relative border-b border-white/10 px-4 py-5 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-pink-200/18 bg-pink-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-pink-100">
                            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                            Account pulse
                        </div>
                        <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">Recent activity</h3>
                        <p className="mt-1 max-w-md text-sm leading-6 text-purple-100/68">
                            {expanded ? "Search your account history without leaving the dashboard." : "Your latest account moment, ready when you are."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onToggleExpanded}
                        aria-expanded={expanded}
                        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.055] px-3 text-sm font-semibold text-white transition hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-pink-200/60"
                    >
                        {expanded ? "Collapse" : "View all"}
                        {expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                    </button>
                </div>
            </div>

            <div className="relative p-4 sm:p-5">
                {loadingSummary ? (
                    <div className="flex min-h-40 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-pink-200" aria-hidden="true" />
                    </div>
                ) : !hasRecordedActivity ? (
                    <EmptyActivityState onUnwrapNow={onUnwrapNow} onOpenExperiences={onOpenExperiences} />
                ) : expanded ? (
                    <ActivityHistory
                        activities={activities}
                        currentPage={currentPage}
                        historyError={historyError}
                        loadingHistory={loadingHistory}
                        onNextPage={onNextPage}
                        onPreviousPage={onPreviousPage}
                        onSearchChange={onSearchChange}
                        searchValue={searchValue}
                        totalPages={totalPages}
                    />
                ) : summaryActivity ? (
                    <div className="space-y-3">
                        <p className="px-1 text-xs font-bold uppercase tracking-[0.14em] text-pink-100/68">
                            Latest event
                        </p>
                        <ActivityRow item={summaryActivity} featured />
                    </div>
                ) : null}
            </div>
        </section>
    );
}
