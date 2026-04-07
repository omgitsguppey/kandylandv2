"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Megaphone, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { DEFAULT_CREATOR_SETTINGS, type CreatorSettings } from "@/lib/creator-experiences";
import {
    describeCreatorFacingOnboardingBlockingReason,
    getCreatorOnboardingStatusSummary,
} from "@/lib/creator-onboarding";
import type { CreatorApplication, UserProfile } from "@/types/db";

type CreatorStats = {
    earningsGd: number;
    pendingCashoutGd: number;
    activeSubscribers: number;
    openRequests: number;
    bookedCalls: number;
};

type CreatorRequestRecord = {
    id: string;
    categoryLabel?: string;
    details?: string;
    priceGd?: number;
    status?: string;
    responseNote?: string | null;
    createdAt?: number;
    respondedAt?: number;
    userId?: string;
};

type CreatorBookingRecord = {
    id: string;
    serviceType?: string;
    status?: string;
    startAt?: number;
    durationMinutes?: number;
    priceGd?: number;
    userId?: string;
};

type CreatorThreadRecord = {
    id: string;
    creatorId?: string;
    userId?: string;
    lastMessageAt?: number;
    lastMessagePreview?: string;
};

type CreatorMessageRecord = {
    id: string;
    senderRole?: string;
    text?: string;
    createdAt?: number;
    messageKind?: string;
};

type CreatorSubscriptionRecord = {
    id: string;
    userId?: string;
    status?: string;
    priceGd?: number;
    renewAt?: number;
    startedAt?: number;
};

type CreatorPayoutRecord = {
    id: string;
    status?: string;
    requestedGd?: number;
    requestedUsd?: number;
    createdAt?: number;
    reviewedAt?: number;
    reviewNote?: string | null;
};

type CreatorBroadcastRecord = {
    id: string;
    title?: string;
    message?: string;
    createdAtMs?: number;
    audienceFollowerCount?: number;
    audienceNotificationCount?: number;
};

type ModuleKey =
    | "settings"
    | "requests"
    | "bookings"
    | "threads"
    | "subscribers"
    | "payouts"
    | "broadcasts";

const moduleLabels: Record<ModuleKey, string> = {
    settings: "creator settings",
    requests: "custom requests",
    bookings: "bookings",
    threads: "messages",
    subscribers: "subscribers",
    payouts: "payouts",
    broadcasts: "broadcasts",
};

function formatRelativeTime(timestamp?: number) {
    if (!timestamp || !Number.isFinite(timestamp)) {
        return "Not available";
    }

    const diffMs = timestamp - Date.now();
    const diffMinutes = Math.round(diffMs / 60_000);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (Math.abs(diffMinutes) < 60) {
        return rtf.format(diffMinutes, "minute");
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 48) {
        return rtf.format(diffHours, "hour");
    }

    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 30) {
        return rtf.format(diffDays, "day");
    }

    return new Date(timestamp).toLocaleString();
}

function formatStatusLabel(value?: string) {
    return value ? value.replaceAll("_", " ") : "unknown";
}

function toneClasses(tone: "good" | "warn" | "bad" | "neutral") {
    switch (tone) {
        case "good":
            return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
        case "warn":
            return "border-amber-400/20 bg-amber-500/10 text-amber-100";
        case "bad":
            return "border-red-400/20 bg-red-500/10 text-red-100";
        default:
            return "border-white/10 bg-white/5 text-gray-200";
    }
}

function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "good" | "warn" | "bad" | "neutral" }) {
    return (
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${toneClasses(tone)}`}>
            {label}
        </span>
    );
}

function MiniStat({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "good" | "warn" | "bad" | "neutral" }) {
    return (
        <div className="rounded-[1.1rem] border border-white/10 bg-black/30 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{label}</p>
            <p className={`mt-2 text-lg font-black ${tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-amber-200" : tone === "bad" ? "text-red-200" : "text-white"}`}>
                {value}
            </p>
        </div>
    );
}

function ModuleCard({
    title,
    subtitle,
    children,
    error,
}: {
    title: string;
    subtitle: string;
    children: React.ReactNode;
    error?: string | null;
}) {
    return (
        <section className="rounded-[1.4rem] border border-white/10 bg-black/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-white">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-gray-400">{subtitle}</p>
                </div>
                {error ? <StatusPill label="Load issue" tone="warn" /> : null}
            </div>
            {error ? (
                <div className="mt-3 rounded-[1rem] border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    {error}
                </div>
            ) : null}
            <div className="mt-4">{children}</div>
        </section>
    );
}

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await authFetch(url, init);
    const body = await response.json().catch(() => ({})) as T & { error?: string };
    if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : `Request failed for ${url}`);
    }
    return body;
}

export function CreatorWorkspacePanel({ userProfile }: { userProfile: UserProfile }) {
    const creatorApplication = userProfile.creatorApplication as CreatorApplication | undefined;
    const isCreatorOperator = userProfile.role === "creator";
    const hasCreatorWorkspace = isCreatorOperator || Boolean(creatorApplication);

    const [loading, setLoading] = useState(false);
    const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
    const [creatorSettings, setCreatorSettings] = useState<CreatorSettings>(DEFAULT_CREATOR_SETTINGS);
    const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null);
    const [requests, setRequests] = useState<CreatorRequestRecord[]>([]);
    const [bookings, setBookings] = useState<CreatorBookingRecord[]>([]);
    const [threads, setThreads] = useState<CreatorThreadRecord[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [threadMessages, setThreadMessages] = useState<CreatorMessageRecord[]>([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [subscribers, setSubscribers] = useState<CreatorSubscriptionRecord[]>([]);
    const [availablePayoutGd, setAvailablePayoutGd] = useState(0);
    const [availablePayoutUsd, setAvailablePayoutUsd] = useState(0);
    const [payoutRequests, setPayoutRequests] = useState<CreatorPayoutRecord[]>([]);
    const [broadcasts, setBroadcasts] = useState<CreatorBroadcastRecord[]>([]);
    const [moduleErrors, setModuleErrors] = useState<Record<ModuleKey, string | null>>({
        settings: null,
        requests: null,
        bookings: null,
        threads: null,
        subscribers: null,
        payouts: null,
        broadcasts: null,
    });
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [replyDraft, setReplyDraft] = useState("");
    const [broadcastDraft, setBroadcastDraft] = useState("");
    const [payoutAmount, setPayoutAmount] = useState(100);

    const onboardingSummary = useMemo(() => {
        if (creatorApplication) {
            return getCreatorOnboardingStatusSummary(creatorApplication);
        }

        if (isCreatorOperator) {
            return {
                stage: "Approved",
                label: "Creator access live",
                summary: "Creator access is already active. The queues below are backed by the live creator routes for messaging, requests, bookings, subscriptions, broadcasts, and payouts.",
                timeline: "",
            };
        }

        return getCreatorOnboardingStatusSummary(undefined);
    }, [creatorApplication, isCreatorOperator]);
    const blockingReasons = useMemo(
        () => (creatorApplication?.blockingReasons ?? []).map((reason) => describeCreatorFacingOnboardingBlockingReason(reason)),
        [creatorApplication?.blockingReasons],
    );
    const selectedThread = useMemo(
        () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
        [selectedThreadId, threads],
    );
    const moduleErrorEntries = useMemo(
        () => Object.entries(moduleErrors).filter((entry): entry is [ModuleKey, string] => typeof entry[1] === "string" && entry[1].length > 0),
        [moduleErrors],
    );
    const capabilitySummary = useMemo(() => ([
        { label: "Messages", enabled: creatorSettings.messagingEnabled },
        { label: "Broadcasts", enabled: creatorSettings.broadcastsEnabled },
        { label: "Subscriptions", enabled: creatorSettings.subscriptionsEnabled },
        { label: "Bookings", enabled: creatorSettings.bookingsEnabled },
        { label: "Custom requests", enabled: creatorSettings.customRequestsEnabled },
    ]), [creatorSettings]);

    const loadWorkspace = useCallback(async () => {
        if (!isCreatorOperator) {
            return;
        }

        setLoading(true);
        const nextErrors: Record<ModuleKey, string | null> = {
            settings: null,
            requests: null,
            bookings: null,
            threads: null,
            subscribers: null,
            payouts: null,
            broadcasts: null,
        };

        const results = await Promise.allSettled([
            readJson<{
                creatorSettings?: CreatorSettings | null;
                stats?: CreatorStats | null;
            }>("/api/creator/settings"),
            readJson<{ requests?: CreatorRequestRecord[] }>("/api/creator/requests"),
            readJson<{ bookings?: CreatorBookingRecord[] }>("/api/creator/bookings"),
            readJson<{ threads?: CreatorThreadRecord[] }>("/api/creator/messages"),
            readJson<{ subscribers?: CreatorSubscriptionRecord[] }>("/api/creator/subscriptions"),
            readJson<{ availableGd?: number; availableUsd?: number; payoutRequests?: CreatorPayoutRecord[] }>("/api/creator/payouts"),
            readJson<{ broadcasts?: CreatorBroadcastRecord[] }>("/api/creator/broadcasts"),
        ]);

        const logFailure = (module: ModuleKey, issue: unknown) => {
            const message = issue instanceof Error ? issue.message : "Request failed";
            nextErrors[module] = message;
            reportClientIssue({
                channel: "runtime",
                severity: "warn",
                message: "Creator workspace module load failed",
                error: issue,
                detail: {
                    module,
                    route: moduleLabels[module],
                },
                consoleLabel: `[CreatorWorkspace] ${module} load failed`,
            });
        };

        const [
            settingsResult,
            requestsResult,
            bookingsResult,
            threadsResult,
            subscribersResult,
            payoutsResult,
            broadcastsResult,
        ] = results;

        if (settingsResult.status === "fulfilled") {
            setCreatorSettings(settingsResult.value.creatorSettings ?? DEFAULT_CREATOR_SETTINGS);
            setCreatorStats(settingsResult.value.stats ?? null);
        } else {
            logFailure("settings", settingsResult.reason);
        }

        if (requestsResult.status === "fulfilled") {
            setRequests(Array.isArray(requestsResult.value.requests) ? requestsResult.value.requests : []);
        } else {
            logFailure("requests", requestsResult.reason);
        }

        if (bookingsResult.status === "fulfilled") {
            setBookings(Array.isArray(bookingsResult.value.bookings) ? bookingsResult.value.bookings : []);
        } else {
            logFailure("bookings", bookingsResult.reason);
        }

        if (threadsResult.status === "fulfilled") {
            const nextThreads = Array.isArray(threadsResult.value.threads) ? threadsResult.value.threads : [];
            setThreads(nextThreads);
            setSelectedThreadId((current) => {
                if (current && nextThreads.some((thread) => thread.id === current)) {
                    return current;
                }
                return nextThreads[0]?.id ?? null;
            });
        } else {
            logFailure("threads", threadsResult.reason);
        }

        if (subscribersResult.status === "fulfilled") {
            setSubscribers(Array.isArray(subscribersResult.value.subscribers) ? subscribersResult.value.subscribers : []);
        } else {
            logFailure("subscribers", subscribersResult.reason);
        }

        if (payoutsResult.status === "fulfilled") {
            setAvailablePayoutGd(typeof payoutsResult.value.availableGd === "number" ? payoutsResult.value.availableGd : 0);
            setAvailablePayoutUsd(typeof payoutsResult.value.availableUsd === "number" ? payoutsResult.value.availableUsd : 0);
            setPayoutRequests(Array.isArray(payoutsResult.value.payoutRequests) ? payoutsResult.value.payoutRequests : []);
        } else {
            logFailure("payouts", payoutsResult.reason);
        }

        if (broadcastsResult.status === "fulfilled") {
            setBroadcasts(Array.isArray(broadcastsResult.value.broadcasts) ? broadcastsResult.value.broadcasts : []);
        } else {
            logFailure("broadcasts", broadcastsResult.reason);
        }

        setModuleErrors(nextErrors);
        setLastLoadedAt(Date.now());
        setLoading(false);
    }, [isCreatorOperator]);

    const loadThreadMessages = useCallback(async (threadId: string) => {
        setThreadLoading(true);
        try {
            const result = await readJson<{
                messages?: CreatorMessageRecord[];
            }>(`/api/creator/messages?threadId=${encodeURIComponent(threadId)}`);
            setThreadMessages(Array.isArray(result.messages) ? result.messages : []);
        } catch (error) {
            reportClientIssue({
                channel: "runtime",
                severity: "warn",
                message: "Creator workspace thread load failed",
                error,
                detail: {
                    threadId,
                },
                consoleLabel: "[CreatorWorkspace] thread load failed",
            });
            toast.error(error instanceof Error ? error.message : "We could not load that message thread.");
        } finally {
            setThreadLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isCreatorOperator) {
            return;
        }

        void loadWorkspace();
    }, [isCreatorOperator, loadWorkspace]);

    useEffect(() => {
        if (!selectedThreadId || !isCreatorOperator) {
            setThreadMessages([]);
            return;
        }

        void loadThreadMessages(selectedThreadId);
    }, [isCreatorOperator, loadThreadMessages, selectedThreadId]);

    const runAction = useCallback(async (actionKey: string, callback: () => Promise<void>, failureMessage: string) => {
        setBusyAction(actionKey);
        try {
            await callback();
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "warn",
                message: "Creator workspace action failed",
                error,
                detail: {
                    actionKey,
                },
                consoleLabel: `[CreatorWorkspace] ${actionKey} failed`,
            });
            toast.error(error instanceof Error ? error.message : failureMessage);
        } finally {
            setBusyAction(null);
        }
    }, []);

    const handleRequestAction = useCallback((requestId: string, action: "accept" | "decline" | "fulfill") => {
        void runAction(`request:${requestId}:${action}`, async () => {
            await readJson("/api/creator/requests", {
                method: "PUT",
                body: JSON.stringify({ requestId, action }),
            });
            toast.success(`Request ${action}ed.`);
            await loadWorkspace();
        }, "We could not update that request.");
    }, [loadWorkspace, runAction]);

    const handleBookingAction = useCallback((bookingId: string, action: "complete" | "cancel") => {
        void runAction(`booking:${bookingId}:${action}`, async () => {
            await readJson("/api/creator/bookings", {
                method: "PUT",
                body: JSON.stringify({ bookingId, action }),
            });
            toast.success(action === "complete" ? "Booking completed." : "Booking canceled.");
            await loadWorkspace();
        }, "We could not update that booking.");
    }, [loadWorkspace, runAction]);

    const handleSendReply = useCallback(() => {
        if (!selectedThread || !replyDraft.trim().length) {
            return;
        }

        void runAction(`reply:${selectedThread.id}`, async () => {
            await readJson("/api/creator/messages", {
                method: "POST",
                body: JSON.stringify({
                    creatorId: userProfile.uid,
                    targetUserId: selectedThread.userId,
                    threadId: selectedThread.id,
                    text: replyDraft.trim(),
                    messageKind: "text",
                }),
            });
            setReplyDraft("");
            toast.success("Reply sent.");
            await Promise.all([loadWorkspace(), loadThreadMessages(selectedThread.id)]);
        }, "We could not send that reply.");
    }, [loadThreadMessages, loadWorkspace, replyDraft, runAction, selectedThread, userProfile.uid]);

    const handlePayoutRequest = useCallback(() => {
        void runAction("payout:request", async () => {
            await readJson("/api/creator/payouts", {
                method: "POST",
                body: JSON.stringify({ requestedGd: payoutAmount }),
            });
            toast.success("Payout request submitted.");
            await loadWorkspace();
        }, "We could not submit that payout request.");
    }, [loadWorkspace, payoutAmount, runAction]);

    const handleBroadcastSend = useCallback(() => {
        if (!broadcastDraft.trim().length) {
            return;
        }

        void runAction("broadcast:send", async () => {
            const result = await readJson<{ broadcast?: CreatorBroadcastRecord }>("/api/creator/broadcasts", {
                method: "POST",
                body: JSON.stringify({ message: broadcastDraft.trim() }),
            });
            setBroadcasts((current) => result.broadcast ? [result.broadcast, ...current] : current);
            setBroadcastDraft("");
            toast.success("Broadcast sent.");
        }, "We could not send that broadcast.");
    }, [broadcastDraft, runAction]);

    if (!hasCreatorWorkspace) {
        return null;
    }

    return (
        <section className="glass-panel mb-5 rounded-3xl p-4 md:mb-6 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-purple">Creator workspace</p>
                    <h2 className="mt-2 text-xl font-black text-white md:text-2xl">Approval, fan work, and creator operations</h2>
                    <p className="mt-2 max-w-3xl text-sm text-gray-300">
                        This lane only shows backend-backed creator workflows. If a module fails to load, the failure stays visible here instead of collapsing into an empty state.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {userProfile.username ? (
                        <Link href={`/creators/${userProfile.username}`} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
                            View creator page
                        </Link>
                    ) : null}
                    {isCreatorOperator ? (
                        <Link href="/dashboard/profile#creator-tools" className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-4 py-2 text-sm font-semibold text-white">
                            Open creator controls
                        </Link>
                    ) : (
                        <Link href="/creators/waitlist" className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-4 py-2 text-sm font-semibold text-white">
                            Open creator onboarding
                        </Link>
                    )}
                </div>
            </div>

            <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-black/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold text-white">{onboardingSummary.label}</p>
                        <p className="mt-1 text-sm leading-6 text-gray-300">{onboardingSummary.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <StatusPill label={onboardingSummary.stage} tone={creatorApplication?.approvalStatus === "creator_approved" ? "good" : blockingReasons.length > 0 ? "warn" : "neutral"} />
                        {creatorApplication?.readyForApproval ? <StatusPill label="Ready for approval" tone="good" /> : null}
                        {typeof creatorApplication?.queuePosition === "number" && creatorApplication.queuePosition > 0 ? (
                            <StatusPill label={`Queue #${creatorApplication.queuePosition}`} tone="neutral" />
                        ) : null}
                    </div>
                </div>

                {creatorApplication ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <MiniStat label="Submission" value={formatStatusLabel(creatorApplication.submissionStatus)} />
                        <MiniStat label="Approval" value={formatStatusLabel(creatorApplication.approvalStatus)} tone={creatorApplication.approvalStatus === "creator_approved" ? "good" : creatorApplication.approvalStatus === "creator_needs_changes" ? "warn" : creatorApplication.approvalStatus === "creator_rejected" ? "bad" : "neutral"} />
                        <MiniStat label="Legal" value={formatStatusLabel(creatorApplication.legalStatus)} />
                        <MiniStat label="Identity" value={formatStatusLabel(creatorApplication.idVerificationStatus)} />
                        <MiniStat label="Segment" value={formatStatusLabel(creatorApplication.segmentationStatus)} />
                    </div>
                ) : isCreatorOperator ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <MiniStat label="Role" value="Creator active" tone="good" />
                        <MiniStat label="Workspace source" value="Live creator routes" />
                        <MiniStat label="Controls" value="Dashboard + profile" />
                    </div>
                ) : null}

                {blockingReasons.length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {blockingReasons.map((item) => (
                            <div key={item.reason} className={`rounded-[1rem] border px-3 py-3 ${toneClasses(item.severity === "error" ? "bad" : item.severity === "warn" ? "warn" : "neutral")}`}>
                                <p className="text-sm font-semibold">{item.label}</p>
                                <p className="mt-1 text-xs leading-5 text-inherit/85">{item.description}</p>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            {isCreatorOperator ? (
                <>
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                        <StatusPill label={loading ? "Refreshing" : "Live creator routes"} tone={loading ? "warn" : "good"} />
                        {lastLoadedAt ? <StatusPill label={`Last checked ${formatRelativeTime(lastLoadedAt)}`} /> : null}
                        {moduleErrorEntries.length > 0 ? <StatusPill label={`${moduleErrorEntries.length} module issues`} tone="warn" /> : null}
                        {capabilitySummary.map((capability) => (
                            <StatusPill
                                key={capability.label}
                                label={`${capability.label} ${capability.enabled ? "on" : "off"}`}
                                tone={capability.enabled ? "good" : "neutral"}
                            />
                        ))}
                    </div>

                    {moduleErrorEntries.length > 0 ? (
                        <div className="mt-4 rounded-[1.1rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                            {moduleErrorEntries.map(([module, message]) => `${moduleLabels[module]}: ${message}`).join(" | ")}
                        </div>
                    ) : null}

                    <div className="mt-5 grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
                        <div className="space-y-4">
                            <ModuleCard
                                title="Creator ops snapshot"
                                subtitle="Real counts pulled from creator settings and ledger-backed stats."
                                error={moduleErrors.settings}
                            >
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                    <MiniStat label="Earnings" value={`${creatorStats?.earningsGd ?? 0} GD`} tone="good" />
                                    <MiniStat label="Pending payout" value={`${creatorStats?.pendingCashoutGd ?? 0} GD`} tone={(creatorStats?.pendingCashoutGd ?? 0) > 0 ? "warn" : "neutral"} />
                                    <MiniStat label="Subscribers" value={creatorStats?.activeSubscribers ?? 0} />
                                    <MiniStat label="Open requests" value={creatorStats?.openRequests ?? 0} tone={(creatorStats?.openRequests ?? 0) > 0 ? "warn" : "neutral"} />
                                    <MiniStat label="Booked calls" value={creatorStats?.bookedCalls ?? 0} tone={(creatorStats?.bookedCalls ?? 0) > 0 ? "warn" : "neutral"} />
                                </div>
                            </ModuleCard>

                            <ModuleCard
                                title="Custom requests"
                                subtitle="Accept, decline, and fulfill paid requests already backed by the creator request route."
                                error={moduleErrors.requests}
                            >
                                <div className="space-y-3">
                                    {requests.length > 0 ? requests.slice(0, 5).map((request) => (
                                        <div key={request.id} className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white">{request.categoryLabel || "Custom request"}</p>
                                                    <p className="mt-1 text-xs text-gray-400">From {request.userId || "fan"} • {formatRelativeTime(request.createdAt)}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <StatusPill label={formatStatusLabel(request.status)} tone={request.status === "pending" ? "warn" : request.status === "fulfilled" ? "good" : "neutral"} />
                                                    <StatusPill label={`${request.priceGd ?? 0} GD`} />
                                                </div>
                                            </div>
                                            <p className="mt-3 text-sm leading-6 text-gray-300">{request.details || "No details provided."}</p>
                                            {request.responseNote ? <p className="mt-2 text-xs text-gray-400">Response note: {request.responseNote}</p> : null}
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {request.status === "pending" ? (
                                                    <>
                                                        <Button
                                                            variant="brand"
                                                            size="sm"
                                                            isLoading={busyAction === `request:${request.id}:accept`}
                                                            onClick={() => handleRequestAction(request.id, "accept")}
                                                        >
                                                            Accept
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            isLoading={busyAction === `request:${request.id}:decline`}
                                                            onClick={() => handleRequestAction(request.id, "decline")}
                                                        >
                                                            Decline
                                                        </Button>
                                                    </>
                                                ) : null}
                                                {request.status === "accepted" ? (
                                                    <Button
                                                        variant="brand"
                                                        size="sm"
                                                        isLoading={busyAction === `request:${request.id}:fulfill`}
                                                        onClick={() => handleRequestAction(request.id, "fulfill")}
                                                    >
                                                        Mark fulfilled
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-4 text-sm text-gray-300">
                                            No custom requests are waiting right now.
                                        </div>
                                    )}
                                </div>
                            </ModuleCard>

                            <ModuleCard
                                title="Bookings"
                                subtitle="Complete or cancel live booking records without opening admin."
                                error={moduleErrors.bookings}
                            >
                                <div className="space-y-3">
                                    {bookings.length > 0 ? bookings.slice(0, 5).map((booking) => (
                                        <div key={booking.id} className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{formatStatusLabel(booking.serviceType)} call</p>
                                                    <p className="mt-1 text-xs text-gray-400">{booking.userId || "fan"} • {formatRelativeTime(booking.startAt)}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <StatusPill label={formatStatusLabel(booking.status)} tone={booking.status === "booked" ? "warn" : booking.status === "completed" ? "good" : "neutral"} />
                                                    <StatusPill label={`${booking.priceGd ?? 0} GD`} />
                                                </div>
                                            </div>
                                            <p className="mt-3 text-sm text-gray-300">
                                                {booking.durationMinutes ?? 0} minutes scheduled.
                                            </p>
                                            {booking.status === "booked" ? (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Button
                                                        variant="brand"
                                                        size="sm"
                                                        isLoading={busyAction === `booking:${booking.id}:complete`}
                                                        onClick={() => handleBookingAction(booking.id, "complete")}
                                                    >
                                                        Complete
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        isLoading={busyAction === `booking:${booking.id}:cancel`}
                                                        onClick={() => handleBookingAction(booking.id, "cancel")}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </div>
                                    )) : (
                                        <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-4 text-sm text-gray-300">
                                            No creator calls are booked right now.
                                        </div>
                                    )}
                                </div>
                            </ModuleCard>

                            <ModuleCard
                                title="Message inbox"
                                subtitle="Creator thread list and replies, backed by the creator message routes with thread ownership checks."
                                error={moduleErrors.threads}
                            >
                                {threads.length > 0 ? (
                                    <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                                        <div className="space-y-2">
                                            {threads.slice(0, 8).map((thread) => (
                                                <button
                                                    key={thread.id}
                                                    type="button"
                                                    onClick={() => setSelectedThreadId(thread.id)}
                                                    className={`w-full rounded-[1rem] border px-3 py-3 text-left transition ${selectedThreadId === thread.id ? "border-brand-purple/40 bg-brand-purple/10" : "border-white/10 bg-black/25 hover:border-white/20"}`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-semibold text-white">{thread.userId || "fan"}</p>
                                                        <span className="text-[11px] text-gray-400">{formatRelativeTime(thread.lastMessageAt)}</span>
                                                    </div>
                                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">{thread.lastMessagePreview || "No preview available."}</p>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="rounded-[1rem] border border-white/10 bg-black/25 p-3">
                                            {selectedThread ? (
                                                <>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-white">{selectedThread.userId || "fan thread"}</p>
                                                            <p className="mt-1 text-xs text-gray-400">Last message {formatRelativeTime(selectedThread.lastMessageAt)}</p>
                                                        </div>
                                                        <StatusPill label="Owner-checked thread" tone="good" />
                                                    </div>
                                                    <div className="mt-3 space-y-2">
                                                        {threadLoading ? (
                                                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                Loading thread…
                                                            </div>
                                                        ) : threadMessages.length > 0 ? threadMessages.slice(-6).map((message) => (
                                                            <div key={message.id} className={`rounded-[0.9rem] px-3 py-2 ${message.senderRole === "creator" ? "bg-brand-purple/15 text-white" : "bg-white/5 text-gray-200"}`}>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-[11px] font-bold uppercase tracking-[0.16em]">{message.senderRole === "creator" ? "You" : "Fan"}</span>
                                                                    <span className="text-[11px] opacity-70">{formatRelativeTime(message.createdAt)}</span>
                                                                </div>
                                                                <p className="mt-1 text-sm leading-6">{message.text || `${formatStatusLabel(message.messageKind)} attachment`}</p>
                                                            </div>
                                                        )) : (
                                                            <div className="rounded-[0.9rem] border border-white/10 bg-black/30 px-3 py-4 text-sm text-gray-300">
                                                                No messages are loaded for this thread yet.
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="mt-3 flex gap-2">
                                                        <textarea
                                                            value={replyDraft}
                                                            onChange={(event) => setReplyDraft(event.target.value.slice(0, 1200))}
                                                            rows={3}
                                                            placeholder="Reply to this fan"
                                                            className="w-full rounded-[1rem] border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                                                        />
                                                        <Button
                                                            variant="brand"
                                                            className="self-end"
                                                            isLoading={busyAction === `reply:${selectedThread.id}`}
                                                            onClick={handleSendReply}
                                                        >
                                                            <Send className="mr-2 h-4 w-4" />
                                                            Reply
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="rounded-[0.9rem] border border-white/10 bg-black/30 px-3 py-4 text-sm text-gray-300">
                                                    Select a thread to inspect the real message history.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-4 text-sm text-gray-300">
                                        No active fan message threads are loaded right now.
                                    </div>
                                )}
                            </ModuleCard>
                        </div>

                        <div className="space-y-4">
                            <ModuleCard
                                title="Audience and memberships"
                                subtitle="Subscribers currently tied to this creator account."
                                error={moduleErrors.subscribers}
                            >
                                <div className="space-y-3">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <MiniStat label="Active members" value={subscribers.filter((entry) => entry.status === "active").length} />
                                        <MiniStat label="Total records" value={subscribers.length} />
                                    </div>
                                    {subscribers.length > 0 ? subscribers.slice(0, 5).map((subscriber) => (
                                        <div key={subscriber.id} className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-white">{subscriber.userId || "subscriber"}</p>
                                                <StatusPill label={formatStatusLabel(subscriber.status)} tone={subscriber.status === "active" ? "good" : "neutral"} />
                                            </div>
                                            <p className="mt-1 text-xs text-gray-400">
                                                {subscriber.renewAt ? `Renews ${formatRelativeTime(subscriber.renewAt)}` : `Started ${formatRelativeTime(subscriber.startedAt)}`}
                                            </p>
                                        </div>
                                    )) : (
                                        <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-4 text-sm text-gray-300">
                                            No subscriber records are loaded yet.
                                        </div>
                                    )}
                                </div>
                            </ModuleCard>

                            <ModuleCard
                                title="Payouts"
                                subtitle="Real ledger-backed creator cashout availability and request history."
                                error={moduleErrors.payouts}
                            >
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <MiniStat label="Available GD" value={availablePayoutGd} tone={availablePayoutGd >= 100 ? "good" : "neutral"} />
                                    <MiniStat label="Cash value" value={`$${availablePayoutUsd.toFixed(2)}`} />
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <input
                                        type="number"
                                        min={100}
                                        step={100}
                                        value={payoutAmount}
                                        onChange={(event) => setPayoutAmount(Math.max(100, Number(event.target.value) || 100))}
                                        className="w-full rounded-[1rem] border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                                    />
                                    <Button
                                        variant="brand"
                                        isLoading={busyAction === "payout:request"}
                                        disabled={availablePayoutGd < 100}
                                        onClick={handlePayoutRequest}
                                    >
                                        Request
                                    </Button>
                                </div>
                                <div className="mt-3 space-y-2">
                                    {payoutRequests.length > 0 ? payoutRequests.slice(0, 4).map((payout) => (
                                        <div key={payout.id} className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-white">{payout.requestedGd ?? 0} GD</p>
                                                <StatusPill label={formatStatusLabel(payout.status)} tone={payout.status === "pending" ? "warn" : payout.status === "honored" ? "good" : "neutral"} />
                                            </div>
                                            <p className="mt-1 text-xs text-gray-400">Requested {formatRelativeTime(payout.createdAt)}</p>
                                            {payout.reviewNote ? <p className="mt-1 text-xs text-gray-300">{payout.reviewNote}</p> : null}
                                        </div>
                                    )) : (
                                        <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-4 text-sm text-gray-300">
                                            No payout requests are on record yet.
                                        </div>
                                    )}
                                </div>
                            </ModuleCard>

                            <ModuleCard
                                title="Broadcasts"
                                subtitle="Send updates to followers who already opted into creator-specific alerts."
                                error={moduleErrors.broadcasts}
                            >
                                <textarea
                                    value={broadcastDraft}
                                    onChange={(event) => setBroadcastDraft(event.target.value.slice(0, 280))}
                                    rows={3}
                                    placeholder="Share what just dropped or what fans should watch next."
                                    className="w-full rounded-[1rem] border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
                                />
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <p className="text-[11px] text-gray-400">{broadcastDraft.length}/280</p>
                                    <Button
                                        variant="brand"
                                        isLoading={busyAction === "broadcast:send"}
                                        disabled={broadcastDraft.trim().length < 4}
                                        onClick={handleBroadcastSend}
                                    >
                                        <Megaphone className="mr-2 h-4 w-4" />
                                        Send update
                                    </Button>
                                </div>
                                <div className="mt-3 space-y-2">
                                    {broadcasts.length > 0 ? broadcasts.slice(0, 4).map((broadcast) => (
                                        <div key={broadcast.id} className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-white">{broadcast.title || "Creator update"}</p>
                                                <span className="text-[11px] text-gray-400">{formatRelativeTime(broadcast.createdAtMs)}</span>
                                            </div>
                                            <p className="mt-2 text-sm leading-6 text-gray-300">{broadcast.message || ""}</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <StatusPill label={`${broadcast.audienceFollowerCount ?? 0} followers`} />
                                                <StatusPill label={`${broadcast.audienceNotificationCount ?? 0} alerts`} tone={(broadcast.audienceNotificationCount ?? 0) > 0 ? "good" : "neutral"} />
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-4 text-sm text-gray-300">
                                            No creator broadcasts are loaded yet.
                                        </div>
                                    )}
                                </div>
                            </ModuleCard>
                        </div>
                    </div>
                </>
            ) : (
                <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-black/35 p-4">
                    <div className="grid gap-3 md:grid-cols-3">
                        <MiniStat label="Current stage" value={onboardingSummary.stage} />
                        <MiniStat label="Queue" value={typeof creatorApplication?.queuePosition === "number" && creatorApplication.queuePosition > 0 ? `#${creatorApplication.queuePosition}` : "Assigned"} />
                        <MiniStat label="Ready for approval" value={creatorApplication?.readyForApproval ? "Yes" : "Not yet"} tone={creatorApplication?.readyForApproval ? "good" : "warn"} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <StatusPill label={`Submission ${formatStatusLabel(creatorApplication?.submissionStatus)}`} />
                        <StatusPill label={`Approval ${formatStatusLabel(creatorApplication?.approvalStatus)}`} tone={creatorApplication?.approvalStatus === "creator_needs_changes" ? "warn" : creatorApplication?.approvalStatus === "creator_rejected" ? "bad" : "neutral"} />
                        <StatusPill label={`Identity ${formatStatusLabel(creatorApplication?.idVerificationStatus)}`} />
                    </div>
                </div>
            )}
        </section>
    );
}
