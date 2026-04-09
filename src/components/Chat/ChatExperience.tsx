"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowLeft,
    CircleDot,
    ImagePlus,
    MessageSquare,
    Send,
    Video,
} from "lucide-react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { onDisconnect, onValue, ref, remove, set } from "firebase/database";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import {
    buildChatPresenceMemberPath,
    CHAT_COLLECTIONS,
    resolveChatThreadReadAt,
    resolveChatThreadUnreadCount,
    type ChatInsufficientFundsPayload,
    type ChatMessageKind,
    type ChatThreadDetail,
    type ChatThreadRecord,
} from "@/lib/chat";
import { reportClientIssue, reportRealtimeIssue, reportStorageIssue } from "@/lib/client-error-reporting";
import { storage, db, rtdb } from "@/lib/firebase-data";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { cn } from "@/lib/utils";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";

type ThreadListResponse = {
    threads?: ChatThreadRecord[];
    selectedThreadId?: string | null;
};

type ThreadDetailResponse = {
    thread: ChatThreadRecord;
    messages: ChatThreadDetail["messages"];
    pricing: ChatThreadDetail["pricing"];
    threadExists: boolean;
};

type PresenceSnapshot = {
    typing?: boolean;
    activeAt?: number;
    displayName?: string;
    role?: string;
};

function formatRelativeTime(timestamp?: number) {
    if (!timestamp || !Number.isFinite(timestamp)) {
        return "just now";
    }

    const diffMs = Date.now() - timestamp;
    const diffMinutes = Math.round(diffMs / 60_000);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (Math.abs(diffMinutes) < 60) {
        return rtf.format(-diffMinutes, "minute");
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 48) {
        return rtf.format(-diffHours, "hour");
    }

    const diffDays = Math.round(diffHours / 24);
    return rtf.format(-diffDays, "day");
}

function formatComposerCost(detail: ThreadDetailResponse | null, kind: ChatMessageKind) {
    if (!detail) {
        return 0;
    }

    if (kind === "image") {
        return detail.pricing.imagePriceGd;
    }

    if (kind === "video") {
        return detail.pricing.videoPriceGd;
    }

    return detail.pricing.textPriceGd;
}

function isImageAttachment(mimeType?: string, assetUrl?: string) {
    return Boolean(mimeType?.startsWith("image/") || assetUrl?.match(/\.(png|jpg|jpeg|gif|webp)$/i));
}

function isVideoAttachment(mimeType?: string, assetUrl?: string) {
    return Boolean(mimeType?.startsWith("video/") || assetUrl?.match(/\.(mp4|webm|mov)$/i));
}

function mergeThreads(nextThreads: ChatThreadRecord[], selectedThread: ChatThreadRecord | null) {
    const merged = new Map<string, ChatThreadRecord>();
    nextThreads.forEach((thread) => {
        merged.set(thread.id, thread);
    });

    if (selectedThread && !merged.has(selectedThread.id)) {
        merged.set(selectedThread.id, selectedThread);
    }

    return Array.from(merged.values()).sort((left, right) => right.lastMessageAt - left.lastMessageAt);
}

function TypingStatus({ presence, fallback }: { presence: PresenceSnapshot | null; fallback: string }) {
    if (presence?.typing) {
        return <span className="text-xs font-medium text-brand-purple">Typing…</span>;
    }

    if (presence?.activeAt) {
        return <span className="text-xs font-medium text-emerald-300">Recently active</span>;
    }

    return <span className="text-xs text-gray-400">{fallback}</span>;
}

function InsufficientFundsCard({
    payload,
    onClose,
    onPurchase,
}: {
    payload: ChatInsufficientFundsPayload | null;
    onClose: () => void;
    onPurchase: () => void;
}) {
    if (!payload) {
        return null;
    }

    return (
        <div className="rounded-[1.4rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-50">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-semibold text-white">More paid Gum Drops needed</p>
                    <p className="mt-1 leading-6 text-amber-100">
                        This message costs {payload.requiredPriceGd} paid GD. You currently have {payload.purchasedBalanceGd} paid GD, so you still need {payload.paidGdShortfall} more.
                    </p>
                </div>
                <button type="button" onClick={onClose} className="text-xs font-bold uppercase tracking-[0.14em] text-amber-200">
                    Close
                </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="brand" size="sm" onClick={onPurchase}>
                    Get paid Gum Drops
                </Button>
                {payload.subscriberFreeChatApplies ? (
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-semibold text-white">
                        Subscriber free chat is active on this thread.
                    </span>
                ) : null}
            </div>
        </div>
    );
}

export function ChatExperience() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isCompactViewport = useCompactViewport();
    const { user, userProfile } = useAuth();
    const { openPurchaseModal } = useUI();

    const creatorId = searchParams.get("creator")?.trim() || "";
    const requestedThreadId = searchParams.get("thread")?.trim() || "";
    const [threads, setThreads] = useState<ChatThreadRecord[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(requestedThreadId || null);
    const [selectedDetail, setSelectedDetail] = useState<ThreadDetailResponse | null>(null);
    const [threadsLoading, setThreadsLoading] = useState(true);
    const [threadLoading, setThreadLoading] = useState(false);
    const [composerText, setComposerText] = useState("");
    const [composerKind, setComposerKind] = useState<ChatMessageKind>("text");
    const [composerFile, setComposerFile] = useState<File | null>(null);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [presence, setPresence] = useState<PresenceSnapshot | null>(null);
    const [insufficientFunds, setInsufficientFunds] = useState<ChatInsufficientFundsPayload | null>(null);
    const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);
    const markReadRef = useRef<string | null>(null);
    const typingResetTimerRef = useRef<number | null>(null);

    const visibleThreads = useMemo(
        () => mergeThreads(threads, selectedDetail?.thread ?? null),
        [selectedDetail?.thread, threads],
    );

    const selectedThread = useMemo(
        () => visibleThreads.find((thread) => thread.id === selectedThreadId) ?? selectedDetail?.thread ?? null,
        [selectedDetail?.thread, selectedThreadId, visibleThreads],
    );

    const loadThreads = useCallback(async () => {
        if (!user) {
            return;
        }

        setThreadsLoading(true);
        try {
            const queryString = creatorId ? `?creatorId=${encodeURIComponent(creatorId)}` : "";
            const response = await authFetch(`/api/chat/threads${queryString}`);
            const body = await response.json() as ThreadListResponse & { error?: string };
            if (!response.ok) {
                throw new Error(body.error || "Failed to load chat threads.");
            }

            const nextThreads = Array.isArray(body.threads) ? body.threads : [];
            setThreads(nextThreads);
            startTransition(() => {
                setSelectedThreadId((current) => current || requestedThreadId || body.selectedThreadId || nextThreads[0]?.id || null);
            });
        } catch (error) {
            reportClientIssue({
                channel: "runtime",
                severity: "warn",
                message: "Chat thread list load failed",
                error,
                detail: {
                    creatorId: creatorId || null,
                },
                consoleLabel: "[Chat] thread list load failed",
            });
            toast.error(error instanceof Error ? error.message : "Failed to load chat threads.");
        } finally {
            setThreadsLoading(false);
        }
    }, [creatorId, requestedThreadId, user]);

    const loadThreadDetail = useCallback(async (threadId: string) => {
        if (!user) {
            return;
        }

        setThreadLoading(true);
        setSelectedDetail(null);
        setInsufficientFunds(null);
        setSendErrorMessage(null);
        try {
            const response = await authFetch(`/api/chat/threads/${encodeURIComponent(threadId)}`);
            const body = await response.json() as ThreadDetailResponse & { error?: string };
            if (!response.ok) {
                throw new Error(body.error || "Failed to load this chat thread.");
            }
            setSelectedDetail(body);
        } catch (error) {
            reportClientIssue({
                channel: "runtime",
                severity: "warn",
                message: "Chat thread detail load failed",
                error,
                detail: {
                    threadId,
                },
                consoleLabel: "[Chat] thread detail load failed",
            });
            setSelectedDetail(null);
            toast.error(error instanceof Error ? error.message : "Failed to load this chat thread.");
        } finally {
            setThreadLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadThreads();
    }, [loadThreads]);

    useEffect(() => {
        if (!selectedThreadId) {
            setSelectedDetail(null);
            return;
        }

        void loadThreadDetail(selectedThreadId);
    }, [loadThreadDetail, selectedThreadId]);

    useEffect(() => {
        if (!selectedThreadId) {
            return;
        }

        const params = new URLSearchParams(searchParams.toString());
        params.set("thread", selectedThreadId);
        if (!creatorId) {
            params.delete("creator");
        }
        router.replace(`/dashboard/chat?${params.toString()}`, { scroll: false });
    }, [creatorId, router, searchParams, selectedThreadId]);

    useEffect(() => {
        if (!user || !userProfile) {
            return;
        }

        const viewerField = creatorId && creatorId !== user.uid
            ? "userId"
            : userProfile.role === "creator"
                ? "creatorId"
                : "userId";

        const unsubscribe = onSnapshot(
            query(collection(db, CHAT_COLLECTIONS.threads), where(viewerField, "==", user.uid)),
            (snapshot) => {
                const nextThreads = snapshot.docs.map((docSnapshot) => {
                    const raw = docSnapshot.data() as ChatThreadRecord;
                    const viewerRole = raw.creatorId === user.uid ? "creator" : "user";
                    return {
                        ...raw,
                        id: docSnapshot.id,
                        counterpartId: viewerRole === "creator" ? raw.userId : raw.creatorId,
                        counterpartDisplayName: viewerRole === "creator"
                            ? (raw.userDisplayName || raw.userUsername || raw.userId)
                            : (raw.creatorDisplayName || raw.creatorUsername || raw.creatorId),
                        counterpartUsername: viewerRole === "creator" ? raw.userUsername : raw.creatorUsername,
                        counterpartPhotoURL: viewerRole === "creator" ? (raw.userPhotoURL ?? null) : (raw.creatorPhotoURL ?? null),
                        viewerRole,
                        unreadCount: resolveChatThreadUnreadCount(raw, viewerRole),
                        readAt: resolveChatThreadReadAt(raw, viewerRole),
                    } satisfies ChatThreadRecord;
                }).sort((left, right) => right.lastMessageAt - left.lastMessageAt);

                setThreads((current) => mergeThreads(nextThreads, selectedDetail?.thread ?? current.find((thread) => thread.id === selectedThreadId) ?? null));
            },
            (error) => {
                reportRealtimeIssue("chat thread list", error, {
                    creatorId: creatorId || null,
                });
            },
        );

        return () => unsubscribe();
    }, [creatorId, selectedDetail?.thread, selectedThreadId, user, userProfile]);

    useEffect(() => {
        if (!selectedThreadId || !user) {
            return;
        }

        const unsubscribe = onSnapshot(
            query(collection(db, CHAT_COLLECTIONS.messages), where("threadId", "==", selectedThreadId)),
            (snapshot) => {
                const nextMessages = snapshot.docs
                    .map((docSnapshot) => ({
                        ...(docSnapshot.data() as ThreadDetailResponse["messages"][number]),
                        id: docSnapshot.id,
                    }))
                    .sort((left, right) => (left.createdAt || 0) - (right.createdAt || 0));

                setSelectedDetail((current) => current ? {
                    ...current,
                    messages: nextMessages,
                } : current);
            },
            (error) => {
                reportRealtimeIssue("chat messages", error, {
                    threadId: selectedThreadId,
                });
            },
        );

        return () => unsubscribe();
    }, [selectedThreadId, user]);

    useEffect(() => {
        if (!selectedDetail || !selectedThreadId) {
            return;
        }

        const latestMessage = selectedDetail.messages[selectedDetail.messages.length - 1];
        if (!latestMessage || latestMessage.senderRole === selectedDetail.thread.viewerRole) {
            return;
        }

        const markerKey = `${selectedThreadId}:${latestMessage.id}:${latestMessage.createdAt}`;
        if (markReadRef.current === markerKey || (selectedDetail.thread.readAt && selectedDetail.thread.readAt >= latestMessage.createdAt)) {
            return;
        }

        markReadRef.current = markerKey;
        void authFetch(`/api/chat/threads/${encodeURIComponent(selectedThreadId)}/read`, {
            method: "POST",
        }).catch((error) => {
            reportClientIssue({
                channel: "realtime",
                severity: "warn",
                message: "Chat read receipt update failed",
                error,
                detail: {
                    threadId: selectedThreadId,
                },
                consoleLabel: "[Chat] read receipt update failed",
            });
        });
    }, [selectedDetail, selectedThreadId]);

    useEffect(() => {
        if (!selectedThreadId || !selectedThread || !user) {
            setPresence(null);
            return;
        }

        const ownPresenceRef = ref(rtdb, buildChatPresenceMemberPath(selectedThreadId, user.uid));
        const counterpartPresenceRef = ref(rtdb, buildChatPresenceMemberPath(selectedThreadId, selectedThread.counterpartId));
        let cancelled = false;
        let heartbeatTimer: number | null = null;

        const syncPresence = (typing: boolean) => set(ownPresenceRef, {
            typing,
            activeAt: Date.now(),
            role: selectedThread.viewerRole,
            displayName: userProfile?.displayName || user.displayName || user.email || "User",
        }).catch((error) => {
            if (!cancelled) {
                reportRealtimeIssue("chat presence write", error, {
                    threadId: selectedThreadId,
                });
            }
        });

        void onDisconnect(ownPresenceRef).remove().catch(() => undefined);
        void syncPresence(false);
        heartbeatTimer = window.setInterval(() => {
            void syncPresence(false);
        }, 15_000);

        const unsubscribe = onValue(counterpartPresenceRef, (snapshot) => {
            setPresence((snapshot.val() as PresenceSnapshot | null) ?? null);
        }, (error) => {
            reportRealtimeIssue("chat presence read", error, {
                threadId: selectedThreadId,
            });
        });

        return () => {
            cancelled = true;
            if (heartbeatTimer) {
                window.clearInterval(heartbeatTimer);
            }
            if (typingResetTimerRef.current) {
                window.clearTimeout(typingResetTimerRef.current);
            }
            void remove(ownPresenceRef).catch(() => undefined);
            unsubscribe();
        };
    }, [selectedThread, selectedThreadId, user, userProfile?.displayName]);

    const pushTypingState = useCallback((typing: boolean) => {
        if (!selectedThreadId || !user) {
            return;
        }

        const ownPresenceRef = ref(rtdb, buildChatPresenceMemberPath(selectedThreadId, user.uid));
        void set(ownPresenceRef, {
            typing,
            activeAt: Date.now(),
            role: selectedThread?.viewerRole || "user",
            displayName: userProfile?.displayName || user.displayName || user.email || "User",
        }).catch((error) => {
            reportRealtimeIssue("chat typing write", error, {
                threadId: selectedThreadId,
            });
        });
    }, [selectedThread?.viewerRole, selectedThreadId, user, userProfile?.displayName]);

    const handleComposerTextChange = useCallback((value: string) => {
        setComposerText(value);
        pushTypingState(value.trim().length > 0);

        if (typingResetTimerRef.current) {
            window.clearTimeout(typingResetTimerRef.current);
        }

        typingResetTimerRef.current = window.setTimeout(() => {
            pushTypingState(false);
        }, 2_000);
    }, [pushTypingState]);

    const handleSelectFile = useCallback((file: File | null) => {
        setComposerFile(file);
        if (file?.type.startsWith("video/")) {
            setComposerKind("video");
            return;
        }
        if (file?.type.startsWith("image/")) {
            setComposerKind("image");
        }
    }, []);

    const uploadAttachment = useCallback(async () => {
        if (!composerFile || !user) {
            return null;
        }

        try {
            const target = storageRef(storage, `creator/messages/${user.uid}/${Date.now()}_${composerFile.name}`);
            await uploadBytes(target, composerFile, {
                contentType: composerFile.type || "application/octet-stream",
            });
            const assetUrl = await getDownloadURL(target);
            return {
                assetUrl,
                assetName: composerFile.name,
                assetMimeType: composerFile.type || "application/octet-stream",
            };
        } catch (error) {
            reportStorageIssue("chat attachment upload", error, {
                fileName: composerFile.name,
                mimeType: composerFile.type,
            });
            throw error;
        }
    }, [composerFile, user]);

    const handleSendMessage = useCallback(async () => {
        if (!selectedThreadId || !selectedThread) {
            return;
        }

        if (!composerText.trim() && !composerFile) {
            toast.error("Add a message or attachment before sending.");
            return;
        }

        setSendingMessage(true);
        setInsufficientFunds(null);
        setSendErrorMessage(null);

        try {
            const attachment = await uploadAttachment();
            const response = await authFetch(`/api/chat/threads/${encodeURIComponent(selectedThreadId)}/messages`, {
                method: "POST",
                body: JSON.stringify({
                    text: composerText.trim(),
                    messageKind: attachment ? (attachment.assetMimeType?.startsWith("video/") ? "video" : "image") : composerKind,
                    ...attachment,
                }),
            });
            const body = await response.json() as { error?: string; errorCode?: string } & Partial<ChatInsufficientFundsPayload>;
            if (!response.ok) {
                if (body.errorCode === "insufficient_paid_gumdrops") {
                    setInsufficientFunds(body as ChatInsufficientFundsPayload);
                    return;
                }

                throw new Error(body.error || "Failed to send message.");
            }

            setComposerText("");
            setComposerFile(null);
            setComposerKind("text");
            pushTypingState(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to send message.";
            setSendErrorMessage(message);
            reportClientIssue({
                channel: "ui",
                severity: "warn",
                message: "Chat message send failed",
                error,
                detail: {
                    threadId: selectedThreadId,
                    messageKind: composerKind,
                    hasAttachment: Boolean(composerFile),
                },
                consoleLabel: "[Chat] send message failed",
            });
            toast.error(message);
        } finally {
            setSendingMessage(false);
        }
    }, [composerFile, composerKind, composerText, pushTypingState, selectedThread, selectedThreadId, uploadAttachment]);

    const latestOutgoingMessageId = useMemo(() => {
        if (!selectedDetail) {
            return null;
        }

        const viewerRole = selectedDetail.thread.viewerRole;
        const outgoing = [...selectedDetail.messages].reverse().find((message) => message.senderRole === viewerRole);
        return outgoing?.id ?? null;
    }, [selectedDetail]);

    useEffect(() => {
        if (!selectedThreadId || !user) {
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, CHAT_COLLECTIONS.threads, selectedThreadId),
            (snapshot) => {
                if (!snapshot.exists()) {
                    return;
                }

                const raw = snapshot.data() as ChatThreadRecord;
                const viewerRole = raw.creatorId === user.uid ? "creator" : "user";
                const nextThread = {
                    ...raw,
                    id: snapshot.id,
                    counterpartId: viewerRole === "creator" ? raw.userId : raw.creatorId,
                    counterpartDisplayName: viewerRole === "creator"
                        ? (raw.userDisplayName || raw.userUsername || raw.userId)
                        : (raw.creatorDisplayName || raw.creatorUsername || raw.creatorId),
                    counterpartUsername: viewerRole === "creator" ? raw.userUsername : raw.creatorUsername,
                    counterpartPhotoURL: viewerRole === "creator" ? (raw.userPhotoURL ?? null) : (raw.creatorPhotoURL ?? null),
                    viewerRole,
                    unreadCount: resolveChatThreadUnreadCount(raw, viewerRole),
                    readAt: resolveChatThreadReadAt(raw, viewerRole),
                } satisfies ChatThreadRecord;

                setThreads((current) => mergeThreads(current.map((thread) => thread.id === nextThread.id ? nextThread : thread), nextThread));
                setSelectedDetail((current) => current ? {
                    ...current,
                    thread: nextThread,
                } : current);
            },
            (error) => {
                reportRealtimeIssue("chat thread", error, {
                    threadId: selectedThreadId,
                });
            },
        );

        return () => unsubscribe();
    }, [selectedThreadId, user]);

    if (!user || !userProfile) {
        return null;
    }

    return (
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-4">
            <header className="mb-5 flex items-end justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-purple">Creator chat</p>
                    <h1 className="mt-1 text-[clamp(1.6rem,4vw,2.8rem)] font-black tracking-tight text-white">Messages</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                        Live creator conversations with realtime threads, read receipts, and paid-message gating based on the current creator rules.
                    </p>
                </div>
                {!isCompactViewport ? (
                    <Link href="/dashboard" className="text-sm font-semibold text-gray-400 hover:text-white">
                        Back to dashboard
                    </Link>
                ) : null}
            </header>

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
                <div className="grid min-h-[72vh] lg:grid-cols-[360px_1fr]">
                    {(!isCompactViewport || !selectedThreadId) ? (
                        <aside className="border-b border-white/10 bg-black/30 lg:border-b-0 lg:border-r">
                            <div className="border-b border-white/10 px-4 py-4">
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Inbox</p>
                                <p className="mt-1 text-sm text-gray-300">
                                    {threadsLoading ? "Loading live threads..." : `${visibleThreads.length} conversation${visibleThreads.length === 1 ? "" : "s"}`}
                                </p>
                            </div>
                            <div className="max-h-[72vh] overflow-y-auto">
                                {visibleThreads.length > 0 ? visibleThreads.map((thread) => (
                                    <button
                                        key={thread.id}
                                        type="button"
                                        onClick={() => startTransition(() => setSelectedThreadId(thread.id))}
                                        className={cn(
                                            "w-full border-b border-white/10 px-4 py-4 text-left transition-colors",
                                            selectedThreadId === thread.id ? "bg-brand-purple/10" : "hover:bg-white/[0.04]",
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-white">{thread.counterpartDisplayName}</p>
                                                <p className="truncate text-xs text-gray-500">
                                                    {thread.counterpartUsername ? `@${thread.counterpartUsername}` : thread.counterpartId}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className="text-[11px] text-gray-500">{thread.lastMessageAt ? formatRelativeTime(thread.lastMessageAt) : "New"}</span>
                                                {thread.unreadCount > 0 ? (
                                                    <span className="rounded-full bg-brand-purple px-2 py-0.5 text-[10px] font-bold text-white">{thread.unreadCount}</span>
                                                ) : null}
                                            </div>
                                        </div>
                                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-300">{thread.lastMessagePreview || "No messages yet"}</p>
                                    </button>
                                )) : (
                                    <div className="px-4 py-8 text-sm text-gray-400">
                                        No chat threads yet. Start from a creator page to open the first one.
                                    </div>
                                )}
                            </div>
                        </aside>
                    ) : null}

                    <section className="flex min-h-[72vh] flex-col bg-[radial-gradient(circle_at_top,#25103b_0%,#110b16_35%,#060608_100%)]">
                        {selectedThread ? (
                            <>
                                <div className="border-b border-white/10 px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        {isCompactViewport ? (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedThreadId(null)}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
                                                aria-label="Back to chat list"
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                            </button>
                                        ) : null}
                                        <div className="min-w-0">
                                            <p className="truncate text-lg font-bold text-white">{selectedThread.counterpartDisplayName}</p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <CircleDot className="h-3.5 w-3.5 text-brand-purple" />
                                                <TypingStatus presence={presence} fallback={selectedThread.lastMessageAt ? `Last message ${formatRelativeTime(selectedThread.lastMessageAt)}` : "No messages yet"} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                                    {threadLoading && !selectedDetail ? (
                                        <div className="text-sm text-gray-300">Loading thread…</div>
                                    ) : selectedDetail?.messages.length ? selectedDetail.messages.map((message) => {
                                        const isOutgoing = message.senderRole === selectedThread.viewerRole;
                                        const isLatestOutgoing = message.id === latestOutgoingMessageId;
                                        const readState = isLatestOutgoing && selectedThread.readAt >= message.createdAt ? "Read" : "Sent";

                                        return (
                                            <div key={message.id} className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}>
                                                <div className={cn(
                                                    "max-w-[85%] rounded-[1.6rem] px-4 py-3 shadow-lg",
                                                    isOutgoing ? "bg-brand-purple text-white" : "bg-zinc-200 text-zinc-900",
                                                )}>
                                                    {message.text ? <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p> : null}
                                                    {message.assetUrl ? (
                                                        <div className="mt-2 overflow-hidden rounded-[1.2rem] border border-black/10 bg-black/10">
                                                            {isImageAttachment(message.assetMimeType, message.assetUrl) ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img src={message.assetUrl} alt="" className="h-auto w-full object-cover" />
                                                            ) : isVideoAttachment(message.assetMimeType, message.assetUrl) ? (
                                                                <video src={message.assetUrl} controls className="h-auto w-full" />
                                                            ) : (
                                                                <a href={message.assetUrl} target="_blank" rel="noreferrer" className="block px-4 py-3 text-sm font-semibold underline">
                                                                    Open attachment
                                                                </a>
                                                            )}
                                                        </div>
                                                    ) : null}
                                                    <div className={cn("mt-2 flex items-center gap-2 text-[11px]", isOutgoing ? "text-white/75" : "text-zinc-600")}>
                                                        <span>{formatRelativeTime(message.createdAt)}</span>
                                                        {isOutgoing ? <span>{readState}</span> : null}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4 text-sm text-gray-300">
                                            No messages yet. This thread is ready when you are.
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-white/10 px-4 py-4">
                                    {sendErrorMessage ? (
                                        <div className="rounded-[1.4rem] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-white">Message failed</p>
                                                    <p className="mt-1 leading-6 text-rose-100">{sendErrorMessage}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSendErrorMessage(null)}
                                                    className="text-xs font-bold uppercase tracking-[0.14em] text-rose-200"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                    <InsufficientFundsCard
                                        payload={insufficientFunds}
                                        onClose={() => setInsufficientFunds(null)}
                                        onPurchase={() => openPurchaseModal(insufficientFunds?.paidGdShortfall)}
                                    />
                                    <div className="mt-3 rounded-[1.6rem] border border-white/10 bg-black/35 p-3">
                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex flex-wrap gap-2">
                                                {(["text", "image", "video"] as const).map((kind) => {
                                                    const cost = formatComposerCost(selectedDetail, kind);
                                                    return (
                                                        <button
                                                            key={kind}
                                                            type="button"
                                                            onClick={() => setComposerKind(kind)}
                                                            className={cn(
                                                                "rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]",
                                                                composerKind === kind
                                                                    ? "border-brand-purple/50 bg-brand-purple/15 text-white"
                                                                    : "border-white/10 bg-white/5 text-gray-400",
                                                            )}
                                                        >
                                                            {kind} {cost > 0 ? `· ${cost} GD` : "· Free"}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {selectedDetail?.pricing.subscriberFreeChatApplies ? (
                                                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-100">
                                                    Subscriber free chat active
                                                </span>
                                            ) : null}
                                        </div>

                                        <textarea
                                            value={composerText}
                                            onChange={(event) => handleComposerTextChange(event.target.value.slice(0, 1200))}
                                            rows={3}
                                            placeholder={selectedThread.viewerRole === "creator" ? "Reply to this fan" : "Write your message"}
                                            className="w-full rounded-[1.2rem] border border-white/10 bg-black/35 px-4 py-3 text-sm text-white placeholder:text-gray-600"
                                        />
                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-200">
                                                {composerKind === "video" ? <Video className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
                                                {composerFile ? composerFile.name : composerKind === "text" ? "Optional attachment" : `Add ${composerKind}`}
                                                <input
                                                    type="file"
                                                    accept={composerKind === "video" ? "video/*" : composerKind === "image" ? "image/*" : "image/*,video/*"}
                                                    className="hidden"
                                                    onChange={(event) => handleSelectFile(event.target.files?.[0] || null)}
                                                />
                                            </label>
                                            <Button variant="brand" onClick={handleSendMessage} isLoading={sendingMessage}>
                                                <Send className="mr-2 h-4 w-4" />
                                                Send
                                            </Button>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
                                            <span>{selectedThread.viewerRole === "creator" ? "Creator replies are free." : "Paid messages use purchased Gum Drops only."}</span>
                                            {!selectedDetail?.pricing.subscriberFreeChatApplies && selectedThread.viewerRole === "user" ? (
                                                <span>Paid balance available: {selectedDetail?.pricing.purchasedBalanceGd ?? 0} GD</span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex h-full min-h-[72vh] flex-col items-center justify-center px-6 text-center">
                                <div className="rounded-full border border-brand-purple/20 bg-brand-purple/10 p-4 text-brand-purple">
                                    <MessageSquare className="h-8 w-8" />
                                </div>
                                <h2 className="mt-5 text-2xl font-black text-white">Open a creator conversation</h2>
                                <p className="mt-2 max-w-md text-sm leading-6 text-gray-400">
                                    Start from a creator page, follow them, then open Chat to keep the conversation in one place.
                                </p>
                                <div className="mt-6 flex flex-wrap justify-center gap-2">
                                    <Link href="/experiences" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
                                        Browse creators
                                    </Link>
                                    <Link href="/dashboard/support" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
                                        Support stays separate
                                    </Link>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
