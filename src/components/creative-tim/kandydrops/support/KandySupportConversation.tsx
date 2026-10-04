"use client";

import {
    CircleHelp,
    LifeBuoy,
    Loader2,
    MessageSquarePlus,
    RefreshCw,
    Send,
    ShieldCheck,
    X,
} from "lucide-react";

import {
    SUPPORT_THREAD_CATEGORIES,
    formatSupportCategoryLabel,
    type SupportThreadCategory,
} from "@/lib/support-readiness";
import { KandySupportConversationCanvas } from "@/components/creative-tim/kandydrops/support/KandySupportConversationCanvas";

type SupportStatusAction = "resolve" | "reopen";
type SupportRecord = Record<string, unknown>;

type KandySupportConversationProps = {
    threadCount: number;
    threads: readonly unknown[];
    threadListLoading: boolean;
    threadListProblem: string | null;
    selectedThreadId: string | null;
    onSelectThread: (threadId: string) => void;
    composerOpen: boolean;
    onComposerOpenChange: (open: boolean) => void;
    subject: string;
    onSubjectChange: (value: string) => void;
    category: SupportThreadCategory;
    onCategoryChange: (category: SupportThreadCategory) => void;
    message: string;
    onMessageChange: (value: string) => void;
    submitting: boolean;
    createDisabled: boolean;
    onCreateThread: () => void;
    selectedThreadLoading: boolean;
    selectedThreadProblem: string | null;
    selectedThreadMissing: boolean;
    selectedThreadMissingCopy: string;
    activeThread: unknown | null;
    messages: readonly unknown[];
    onRefresh: () => void;
    updatingStatus: boolean;
    onStatusAction: (action: SupportStatusAction) => void;
    reply: string;
    onReplyChange: (value: string) => void;
    replying: boolean;
    onReply: () => void;
};

function asRecord(value: unknown): SupportRecord {
    return value && typeof value === "object" ? (value as SupportRecord) : {};
}

function readText(value: unknown, keys: string[], fallback = ""): string {
    const record = asRecord(value);

    for (const key of keys) {
        const candidate = record[key];

        if (typeof candidate === "string" && candidate.trim()) {
            return candidate;
        }
    }

    return fallback;
}

function readNumber(value: unknown, keys: string[]): number {
    const record = asRecord(value);

    for (const key of keys) {
        const candidate = record[key];

        if (typeof candidate === "number" && Number.isFinite(candidate)) {
            return candidate;
        }

        if (typeof candidate === "string" && candidate.trim()) {
            const parsed = Number(candidate);

            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }

    return 0;
}

function formatRelativeTime(value: number): string {
    if (!value) {
        return "Not recorded";
    }

    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const deltaMinutes = Math.round((value - Date.now()) / 60_000);

    if (Math.abs(deltaMinutes) < 60) {
        return formatter.format(deltaMinutes, "minute");
    }

    const deltaHours = Math.round(deltaMinutes / 60);

    if (Math.abs(deltaHours) < 48) {
        return formatter.format(deltaHours, "hour");
    }

    const deltaDays = Math.round(deltaHours / 24);

    if (Math.abs(deltaDays) < 30) {
        return formatter.format(deltaDays, "day");
    }

    return new Date(value).toLocaleString();
}

function formatStatus(status: string): string {
    if (!status) {
        return "Open";
    }

    return status
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCategory(category: string): string {
    return category
        ? formatSupportCategoryLabel(category as SupportThreadCategory)
        : "General";
}

function threadId(thread: unknown): string {
    return readText(thread, ["id", "threadId"]);
}

function threadSubject(thread: unknown): string {
    return readText(thread, ["subject", "title"], "Support conversation");
}

function threadCategory(thread: unknown): string {
    return readText(thread, ["category", "topic"], "general");
}

function threadStatus(thread: unknown): string {
    return readText(thread, ["status", "state"], "open").toLowerCase();
}

function threadPreview(thread: unknown): string {
    return readText(
        thread,
        ["lastMessagePreview", "preview", "lastMessage", "latestMessage", "message"],
        "Open this conversation to see the latest update."
    );
}

function threadTimestamp(thread: unknown): number {
    return readNumber(thread, ["lastMessageAt", "updatedAt", "latestMessageAt", "createdAt"]);
}

function threadHasUnread(thread: unknown): boolean {
    const record = asRecord(thread);

    if (typeof record.unreadForUser === "boolean") {
        return record.unreadForUser;
    }

    return readNumber(thread, ["unreadCount", "unreadMessages", "unread"]) > 0;
}

function messageBody(message: unknown): string {
    return readText(message, ["body", "message", "content", "text"], "Message available in this conversation.");
}

function messageTimestamp(message: unknown): number {
    return readNumber(message, ["createdAt", "sentAt", "updatedAt", "timestamp"]);
}

function messageIsFromUser(message: unknown): boolean {
    const actor = readText(
        message,
        ["authorType", "authorRole", "senderRole", "senderType", "sender", "role", "actor"],
        ""
    ).toLowerCase();

    return ["user", "customer", "member", "creator", "requester"].includes(actor);
}

function messageAuthor(message: unknown): string {
    return messageIsFromUser(message)
        ? "You"
        : readText(message, ["authorName", "senderName", "name"], "KandyDrops support");
}

function messageInitial(message: unknown): string {
    return messageAuthor(message).trim().charAt(0).toUpperCase() || "K";
}

function isResolved(status: string): boolean {
    return status === "resolved" || status === "closed";
}

export function KandySupportConversation({
    threadCount,
    threads,
    threadListLoading,
    threadListProblem,
    selectedThreadId,
    onSelectThread,
    composerOpen,
    onComposerOpenChange,
    subject,
    onSubjectChange,
    category,
    onCategoryChange,
    message,
    onMessageChange,
    submitting,
    createDisabled,
    onCreateThread,
    selectedThreadLoading,
    selectedThreadProblem,
    selectedThreadMissing,
    selectedThreadMissingCopy,
    activeThread,
    messages,
    onRefresh,
    updatingStatus,
    onStatusAction,
    reply,
    onReplyChange,
    replying,
    onReply,
}: KandySupportConversationProps) {
    const selectedSummary = threads.find((thread) => threadId(thread) === selectedThreadId) ?? null;
    const displayedThread = activeThread ?? selectedSummary;
    const activeStatus = threadStatus(displayedThread);
    const conversationResolved = isResolved(activeStatus);

    return (
        <div className="relative mx-auto w-full max-w-7xl overflow-hidden px-3 pb-24 pt-16 sm:px-4 md:pt-[4.5rem]">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-10 -z-10 h-[32rem] bg-[radial-gradient(circle_at_12%_18%,rgba(236,72,153,0.23),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(168,85,247,0.28),transparent_35%),linear-gradient(180deg,rgba(49,12,81,0.54),rgba(10,2,24,0))] blur-3xl"
            />

            <header className="overflow-hidden rounded-[2rem] border border-pink-200/15 bg-[linear-gradient(132deg,rgba(70,17,104,0.92),rgba(36,7,71,0.82)_54%,rgba(96,20,106,0.78))] p-5 shadow-[0_28px_90px_rgba(10,1,27,0.38)] backdrop-blur-xl sm:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-200/20 bg-white/[0.09] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-pink-100">
                            <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
                            Kandy care
                        </div>
                        <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                            A softer place to get unstuck.
                        </h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-purple-100/78 sm:text-base">
                            Keep your questions, replies, and recovery details together in one private
                            KandyDrops conversation.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-left">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pink-100/65">
                                Your inbox
                            </p>
                            <p className="mt-0.5 text-lg font-semibold text-white">
                                {threadCount} {threadCount === 1 ? "thread" : "threads"}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onComposerOpenChange(!composerOpen)}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-pink-100/30 bg-pink-400 px-4 text-sm font-bold text-purple-950 shadow-[0_12px_30px_rgba(236,72,153,0.28)] transition hover:bg-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:ring-offset-2 focus:ring-offset-purple-950"
                        >
                            {composerOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />}
                            {composerOpen ? "Close new request" : "Start a support thread"}
                        </button>
                    </div>
                </div>
            </header>

            <KandySupportConversationCanvas
                threadCount={threadCount}
                switcherOpen={composerOpen || !selectedThreadId}
                switcher={(
                    <div className="min-h-0">

                    {composerOpen ? (
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                onCreateThread();
                            }}
                            className="border-b border-white/10 bg-[linear-gradient(145deg,rgba(236,72,153,0.14),rgba(124,58,237,0.1))] p-4 sm:p-5"
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 rounded-xl border border-pink-200/20 bg-pink-400/15 p-2 text-pink-100">
                                    <CircleHelp className="h-4 w-4" aria-hidden="true" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-white">What can we help with?</h2>
                                    <p className="mt-1 text-xs leading-5 text-purple-100/66">
                                        Give this thread a clear subject so the right person can pick it up.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-semibold text-pink-100/78">
                                        Subject
                                    </span>
                                    <input
                                        value={subject}
                                        onChange={(event) => onSubjectChange(event.target.value)}
                                        maxLength={160}
                                        placeholder="Tell us what happened"
                                        className="min-h-11 w-full rounded-xl border border-white/12 bg-[#130324]/72 px-3 text-sm text-white placeholder:text-purple-100/40 outline-none transition focus:border-pink-200/60 focus:ring-2 focus:ring-pink-300/20"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-semibold text-pink-100/78">
                                        Topic
                                    </span>
                                    <select
                                        value={category}
                                        onChange={(event) =>
                                            onCategoryChange(event.target.value as SupportThreadCategory)
                                        }
                                        className="min-h-11 w-full rounded-xl border border-white/12 bg-[#130324]/72 px-3 text-sm text-white outline-none transition focus:border-pink-200/60 focus:ring-2 focus:ring-pink-300/20"
                                    >
                                        {SUPPORT_THREAD_CATEGORIES.map((option) => (
                                            <option key={option} value={option} className="bg-[#21083e]">
                                                {formatSupportCategoryLabel(option)}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-semibold text-pink-100/78">
                                        Message
                                    </span>
                                    <textarea
                                        value={message}
                                        onChange={(event) => onMessageChange(event.target.value)}
                                        maxLength={4_000}
                                        rows={4}
                                        placeholder="Include the details that will help us understand."
                                        className="w-full rounded-xl border border-white/12 bg-[#130324]/72 px-3 py-3 text-sm leading-6 text-white placeholder:text-purple-100/40 outline-none transition focus:border-pink-200/60 focus:ring-2 focus:ring-pink-300/20"
                                    />
                                </label>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="flex max-w-[17rem] items-start gap-2 text-xs leading-5 text-purple-100/62">
                                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-200" aria-hidden="true" />
                                    This request stays connected to your KandyDrops account.
                                </p>
                                <button
                                    type="submit"
                                    disabled={submitting || createDisabled}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-purple-950 transition hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-purple-950 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                                    Send request
                                </button>
                            </div>
                        </form>
                    ) : null}

                    <div className="p-2.5 sm:p-3">
                        {threadListProblem ? (
                            <div role="alert" className="rounded-2xl border border-rose-200/25 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
                                <p className="font-semibold">Your support threads could not load.</p>
                                <p className="mt-1 text-rose-100/80">{threadListProblem}</p>
                            </div>
                        ) : null}

                        {threadListLoading && threads.length === 0 ? (
                            <div className="flex min-h-40 items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.035] px-4 text-sm text-purple-100/70">
                                <Loader2 className="h-4 w-4 animate-spin text-pink-200" aria-hidden="true" />
                                Loading your conversations
                            </div>
                        ) : null}

                        {!threadListLoading && !threadListProblem && threads.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.035] px-5 py-8 text-center">
                                <LifeBuoy className="mx-auto h-6 w-6 text-pink-200" aria-hidden="true" />
                                <p className="mt-3 text-sm font-semibold text-white">No support threads yet</p>
                                <p className="mt-1 text-xs leading-5 text-purple-100/65">
                                    Start a conversation whenever something needs a little care.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => onComposerOpenChange(true)}
                                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-pink-200/25 bg-pink-400/10 px-3 text-sm font-semibold text-pink-100 transition hover:bg-pink-400/20 focus:outline-none focus:ring-2 focus:ring-pink-200/60"
                                >
                                    Ask for support
                                </button>
                            </div>
                        ) : null}

                        {threads.length > 0 ? (
                            <ul className="space-y-2" aria-label="Support conversations">
                                {threads.map((thread) => {
                                    const id = threadId(thread);
                                    const isSelected = id === selectedThreadId;
                                    const unread = threadHasUnread(thread);

                                    return (
                                        <li key={id || threadSubject(thread)}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (id) {
                                                        onSelectThread(id);
                                                    }
                                                }}
                                                aria-current={isSelected ? "page" : undefined}
                                                className={[
                                                    "w-full rounded-2xl border p-3.5 text-left transition focus:outline-none focus:ring-2 focus:ring-pink-200/60",
                                                    isSelected
                                                        ? "border-pink-200/35 bg-[linear-gradient(135deg,rgba(236,72,153,0.2),rgba(139,92,246,0.16))] shadow-[0_10px_26px_rgba(0,0,0,0.14)]"
                                                        : "border-transparent bg-white/[0.035] hover:border-white/12 hover:bg-white/[0.075]",
                                                ].join(" ")}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-pink-200/15 bg-pink-400/10 text-pink-100">
                                                        <CircleHelp className="h-4 w-4" aria-hidden="true" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <p className="truncate text-sm font-semibold text-white">
                                                                {threadSubject(thread)}
                                                            </p>
                                                            <span className="shrink-0 text-[11px] text-purple-100/54">
                                                                {formatRelativeTime(threadTimestamp(thread))}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-purple-100/64">
                                                            {threadPreview(thread)}
                                                        </p>
                                                        <div className="mt-2.5 flex items-center justify-between gap-2">
                                                            <span className="rounded-full border border-white/10 bg-black/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-pink-100/82">
                                                                {formatCategory(threadCategory(thread))}
                                                            </span>
                                                            {unread ? (
                                                                <span className="h-2.5 w-2.5 rounded-full bg-pink-300" aria-label="Unread support reply" />
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : null}
                    </div>
                    </div>
                )}
            >

                <section className="min-h-[34rem] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(150deg,rgba(41,9,76,0.9),rgba(18,3,42,0.9))] shadow-[0_20px_60px_rgba(10,1,27,0.3)] backdrop-blur-xl">
                    {!selectedThreadId ? (
                        <div className="flex min-h-[34rem] flex-col items-center justify-center px-6 text-center">
                            <div className="rounded-[1.35rem] border border-pink-200/20 bg-pink-400/10 p-4 text-pink-100">
                                <CircleHelp className="h-7 w-7" aria-hidden="true" />
                            </div>
                            <h2 className="mt-5 text-xl font-semibold text-white">Choose a conversation</h2>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-purple-100/65">
                                Select a thread to read the full exchange, or start a new request when you need us.
                            </p>
                        </div>
                    ) : null}

                    {selectedThreadId && selectedThreadLoading && !activeThread ? (
                        <div className="flex min-h-[34rem] items-center justify-center gap-2 px-6 text-sm text-purple-100/70">
                            <Loader2 className="h-4 w-4 animate-spin text-pink-200" aria-hidden="true" />
                            Opening your conversation
                        </div>
                    ) : null}

                    {selectedThreadId && !selectedThreadLoading && selectedThreadProblem ? (
                        <div className="flex min-h-[34rem] items-center justify-center p-6">
                            <div role="alert" className="max-w-md rounded-[1.5rem] border border-rose-200/25 bg-rose-400/10 p-5 text-center">
                                <p className="text-base font-semibold text-rose-50">This conversation could not load.</p>
                                <p className="mt-2 text-sm leading-6 text-rose-100/80">{selectedThreadProblem}</p>
                                <button
                                    type="button"
                                    onClick={onRefresh}
                                    className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-100/25 bg-rose-50/10 px-4 text-sm font-semibold text-rose-50 transition hover:bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-rose-100/60"
                                >
                                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                                    Try again
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {selectedThreadId && !selectedThreadLoading && !selectedThreadProblem && selectedThreadMissing ? (
                        <div className="flex min-h-[34rem] items-center justify-center p-6">
                            <div className="max-w-md rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 text-center">
                                <CircleHelp className="mx-auto h-6 w-6 text-pink-200" aria-hidden="true" />
                                <p className="mt-3 text-base font-semibold text-white">That support thread is unavailable.</p>
                                <p className="mt-2 text-sm leading-6 text-purple-100/70">{selectedThreadMissingCopy}</p>
                            </div>
                        </div>
                    ) : null}

                    {selectedThreadId && !selectedThreadProblem && !selectedThreadMissing && displayedThread ? (
                        <div className="flex min-h-[34rem] flex-col">
                            <div className="border-b border-white/10 bg-white/[0.035] px-4 py-4 sm:px-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full border border-pink-200/20 bg-pink-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-pink-100">
                                                {formatCategory(threadCategory(displayedThread))}
                                            </span>
                                            <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-purple-100/72">
                                                {formatStatus(activeStatus)}
                                            </span>
                                        </div>
                                        <h2 className="mt-3 truncate text-lg font-semibold text-white sm:text-xl">
                                            {threadSubject(displayedThread)}
                                        </h2>
                                        <p className="mt-1 text-xs text-purple-100/58">
                                            Private support conversation for your account
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={onRefresh}
                                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.055] text-purple-100 transition hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-pink-200/60"
                                        >
                                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                                            <span className="sr-only">Refresh conversation</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={updatingStatus}
                                            onClick={() => onStatusAction(conversationResolved ? "reopen" : "resolve")}
                                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-pink-200/25 bg-pink-400/10 px-3.5 text-sm font-semibold text-pink-100 transition hover:bg-pink-400/20 focus:outline-none focus:ring-2 focus:ring-pink-200/60 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {updatingStatus ? "Updating..." : conversationResolved ? "Reopen" : "Mark resolved"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div
                                role="log"
                                aria-live="polite"
                                aria-relevant="additions text"
                                className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5"
                            >
                                {messages.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-5 py-8 text-center">
                                        <p className="text-sm font-semibold text-white">This thread is ready for your message.</p>
                                        <p className="mt-1 text-xs leading-5 text-purple-100/62">
                                            Send the details below and KandyDrops support will see them in this conversation.
                                        </p>
                                    </div>
                                ) : null}

                                {messages.map((item, index) => {
                                    const fromUser = messageIsFromUser(item);
                                    const author = messageAuthor(item);

                                    return (
                                        <article
                                            key={readText(item, ["id", "messageId"], String(index))}
                                            className={["flex gap-3", fromUser ? "flex-row-reverse" : "flex-row"].join(" ")}
                                        >
                                            <div
                                                className={[
                                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold",
                                                    fromUser
                                                        ? "border-pink-200/35 bg-pink-300 text-purple-950"
                                                        : "border-white/12 bg-white/[0.08] text-pink-100",
                                                ].join(" ")}
                                            >
                                                {messageInitial(item)}
                                            </div>
                                            <div className={fromUser ? "max-w-[85%] text-right" : "max-w-[85%]"}>
                                                <div className="mb-1 flex items-center gap-2 text-[11px] text-purple-100/55">
                                                    <span className="font-semibold text-purple-100/80">{author}</span>
                                                    <span>{formatRelativeTime(messageTimestamp(item))}</span>
                                                </div>
                                                <div
                                                    className={[
                                                        "rounded-2xl px-4 py-3 text-sm leading-6 shadow-[0_10px_24px_rgba(0,0,0,0.1)]",
                                                        fromUser
                                                            ? "rounded-tr-md bg-pink-300 text-purple-950"
                                                            : "rounded-tl-md border border-white/10 bg-white/[0.07] text-purple-50",
                                                    ].join(" ")}
                                                >
                                                    <p className="whitespace-pre-wrap break-words">{messageBody(item)}</p>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>

                            <div className="border-t border-white/10 bg-black/10 p-4 sm:p-5">
                                {conversationResolved ? (
                                    <div className="flex flex-col gap-3 rounded-2xl border border-pink-200/16 bg-pink-400/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-white">This thread is marked resolved.</p>
                                            <p className="mt-1 text-xs leading-5 text-purple-100/64">
                                                Reopen it if you still need help with the same issue.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={updatingStatus}
                                            onClick={() => onStatusAction("reopen")}
                                            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-purple-950 transition hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-white/80 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {updatingStatus ? "Reopening..." : "Reopen thread"}
                                        </button>
                                    </div>
                                ) : (
                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            onReply();
                                        }}
                                        className="flex flex-col gap-3 sm:flex-row sm:items-end"
                                    >
                                        <label className="min-w-0 flex-1">
                                            <span className="sr-only">Reply to support</span>
                                            <textarea
                                                value={reply}
                                                onChange={(event) => onReplyChange(event.target.value)}
                                                rows={3}
                                                maxLength={4_000}
                                                placeholder="Reply with any new details..."
                                                className="w-full rounded-2xl border border-white/12 bg-[#130324]/72 px-4 py-3 text-sm leading-6 text-white placeholder:text-purple-100/40 outline-none transition focus:border-pink-200/60 focus:ring-2 focus:ring-pink-300/20"
                                            />
                                        </label>
                                        <button
                                            type="submit"
                                            disabled={replying || !reply.trim()}
                                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-pink-300 px-4 text-sm font-bold text-purple-950 shadow-[0_12px_26px_rgba(236,72,153,0.22)] transition hover:bg-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:ring-offset-2 focus:ring-offset-purple-950 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {replying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                                            Send reply
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    ) : null}
                </section>
            </KandySupportConversationCanvas>
        </div>
    );
}
