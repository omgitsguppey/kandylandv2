"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createAutoHealingObserver } from "@/lib/self-healing";
import {
    ArrowLeft,
    Check,
    ChevronRight,
    Circle,
    ImageIcon,
    MessageSquare,
    Plus,
    Search,
    Send,
    SquarePen,
    Trash2,
    Video,
    X,
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { onDisconnect, onValue, ref, remove, set } from "firebase/database";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import { resolveChatAttachmentKind } from "@/lib/chat-attachments";
import { buildChatSoftSealScope, softOpenChatValue } from "@/lib/chat-soft-seal";
import {
    buildChatPresenceMemberPath,
    CHAT_COLLECTIONS,
    isChatThreadVisibleToViewer,
    resolveChatThreadReadAt,
    resolveChatThreadUnreadCount,
    resolveChatViewerRole,
    type ChatInsufficientFundsPayload,
    type ChatMessageKind,
    type ChatThreadDetail,
    type ChatThreadRecord,
} from "@/lib/chat";
import {
    reconcileChatSendSuccess,
    type ChatSendRealtimePayload,
} from "@/lib/chat-send-realtime";
import {
    buildChatThreadRouteSyncTarget,
} from "@/lib/chat-realtime";
import {
    buildChatSendErrorMessage,
    buildChatSendWarningMessage,
    type ChatSendWarning,
} from "@/lib/chat-send-feedback";
import { reportClientIssue, reportRealtimeIssue, reportStorageIssue } from "@/lib/client-error-reporting";
import { storage, db, rtdb } from "@/lib/firebase-data";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { cn } from "@/lib/utils";
import { ref as storageRef, uploadBytes } from "firebase/storage";

type ThreadListResponse = {
    threads?: ChatThreadRecord[];
    selectedThreadId?: string | null;
};

type FollowedCreatorEntry = {
    uid: string;
    displayName: string;
    username: string;
    photoURL: string | null;
    bio: string;
    isVerified: boolean;
    following: boolean;
};

type CreatorRelationshipsListResponse = {
    followedCreators?: FollowedCreatorEntry[];
};

type ThreadDetailResponse = {
    thread: ChatThreadRecord;
    messages: ChatThreadDetail["messages"];
    pricing: ChatThreadDetail["pricing"];
    threadExists: boolean;
};

type ChatSendResponse = {
    error?: string;
    errorCode?: string;
    warnings?: ChatSendWarning[];
} & Partial<ChatInsufficientFundsPayload> & Partial<ChatSendRealtimePayload>;

type ChatAttachmentPrepareResponse = {
    storagePath: string;
    fileName: string;
    mimeType: string;
};

type ChatAttachmentCompleteResponse = {
    assetUrl: string;
    assetName: string;
    assetMimeType: string;
    storagePath: string;
};

type UploadedChatAttachment = {
    assetUrl: string;
    assetName: string;
    assetMimeType: string;
    storagePath: string;
};

type PresenceSnapshot = {
    typing?: boolean;
    activeAt?: number;
    displayName?: string;
    role?: string;
};

type LoadThreadsOptions = {
    background?: boolean;
    quiet?: boolean;
};

type LoadThreadDetailOptions = {
    background?: boolean;
    quiet?: boolean;
};

const MESSAGE_GROUP_GAP_MS = 15 * 60_000;
const CHAT_THREAD_LIST_SCOPE = "chat thread list";
const CHAT_MESSAGES_SCOPE = "chat messages";
const CHAT_REALTIME_SCOPES = [
    CHAT_THREAD_LIST_SCOPE,
    CHAT_MESSAGES_SCOPE,
] as const;

type ChatRealtimeScope = typeof CHAT_REALTIME_SCOPES[number];

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

function formatTimelineLabel(timestamp?: number) {
    if (!timestamp || !Number.isFinite(timestamp)) {
        return "Just now";
    }

    const current = new Date(timestamp);
    const now = new Date();
    const timeLabel = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
    }).format(current);

    if (current.toDateString() === now.toDateString()) {
        return `Today ${timeLabel}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (current.toDateString() === yesterday.toDateString()) {
        return `Yesterday ${timeLabel}`;
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(current);
}

function formatThreadListTime(timestamp?: number) {
    if (!timestamp || !Number.isFinite(timestamp)) {
        return "";
    }

    const current = new Date(timestamp);
    const now = new Date();

    if (current.toDateString() === now.toDateString()) {
        return new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
        }).format(current);
    }

    const diffDays = Math.floor((now.getTime() - current.getTime()) / 86_400_000);
    if (diffDays < 7) {
        return new Intl.DateTimeFormat("en-US", {
            weekday: "short",
        }).format(current);
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
    }).format(current);
}

function shouldRenderTimelineMarker(
    message: ThreadDetailResponse["messages"][number],
    previousMessage?: ThreadDetailResponse["messages"][number],
) {
    if (!previousMessage) {
        return true;
    }

    const currentDate = new Date(message.createdAt).toDateString();
    const previousDate = new Date(previousMessage.createdAt).toDateString();
    if (currentDate !== previousDate) {
        return true;
    }

    return Math.abs(message.createdAt - previousMessage.createdAt) >= MESSAGE_GROUP_GAP_MS;
}

function getDisplayInitial(label?: string | null) {
    const normalized = (label || "").trim();
    if (!normalized) {
        return "?";
    }

    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return parts[0].slice(0, 1).toUpperCase();
    }

    return `${parts[0]?.slice(0, 1) || ""}${parts[1]?.slice(0, 1) || ""}`.toUpperCase();
}

function ChatAvatar({
    photoURL,
    label,
    sizeClassName,
    textClassName,
}: {
    photoURL?: string | null;
    label?: string | null;
    sizeClassName: string;
    textClassName: string;
}) {
    if (photoURL) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={photoURL}
                alt=""
                className={cn("rounded-full object-cover ring-1 ring-white/10", sizeClassName)}
            />
        );
    }

    return (
        <div className={cn(
            "flex items-center justify-center rounded-full bg-[linear-gradient(145deg,#34204f_0%,#17171b_100%)] font-semibold text-white ring-1 ring-white/10",
            sizeClassName,
            textClassName,
        )}>
            {getDisplayInitial(label)}
        </div>
    );
}

function renderPriceSummary(detail: ThreadDetailResponse | null, viewerRole: ChatThreadRecord["viewerRole"]) {
    if (!detail) {
        return null;
    }

    if (detail.pricing.subscriberFreeChatApplies) {
        return "Subscriber chat is free on this thread.";
    }

    if (viewerRole === "creator") {
        return "Creator replies are free.";
    }

    return `Text ${detail.pricing.textPriceGd} GD, image ${detail.pricing.imagePriceGd} GD, video ${detail.pricing.videoPriceGd} GD. Paid balance ${detail.pricing.purchasedBalanceGd} GD.`;
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
    const searchParamsString = searchParams.toString();
    const [threads, setThreads] = useState<ChatThreadRecord[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(requestedThreadId || null);
    const [selectedDetail, setSelectedDetail] = useState<ThreadDetailResponse | null>(null);
    const [threadsLoading, setThreadsLoading] = useState(true);
    const [threadLoading, setThreadLoading] = useState(false);
    const [threadSearch, setThreadSearch] = useState("");
    const [followedCreators, setFollowedCreators] = useState<FollowedCreatorEntry[]>([]);
    const [composePickerOpen, setComposePickerOpen] = useState(false);
    const [threadEditMenuOpen, setThreadEditMenuOpen] = useState(false);
    const [threadSelectionMode, setThreadSelectionMode] = useState(false);
    const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);
    const [editingThreads, setEditingThreads] = useState(false);
    const [composerText, setComposerText] = useState("");
    const [composerKind, setComposerKind] = useState<ChatMessageKind>("text");
    const [composerFile, setComposerFile] = useState<File | null>(null);
    const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [presence, setPresence] = useState<PresenceSnapshot | null>(null);
    const [insufficientFunds, setInsufficientFunds] = useState<ChatInsufficientFundsPayload | null>(null);
    const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);
    const [sendWarningMessage, setSendWarningMessage] = useState<string | null>(null);
    const markReadRef = useRef<string | null>(null);
    const typingResetTimerRef = useRef<number | null>(null);
    const messageListRef = useRef<HTMLDivElement | null>(null);
    const shouldStickToBottomRef = useRef(true);
    const attachmentMenuRef = useRef<HTMLDivElement | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const videoInputRef = useRef<HTMLInputElement | null>(null);
    const composePickerRef = useRef<HTMLDivElement | null>(null);
    const threadEditMenuRef = useRef<HTMLDivElement | null>(null);
    const selectedThreadIdRef = useRef<string | null>(selectedThreadId);
    const selectedDetailThreadRef = useRef<ChatThreadRecord | null>(selectedDetail?.thread ?? null);
    const threadDetailRequestIdRef = useRef(0);
    const threadsLoadRequestIdRef = useRef(0);

    const visibleThreads = useMemo(
        () => mergeThreads(threads, selectedDetail?.thread ?? null),
        [selectedDetail?.thread, threads],
    );

    const selectedThread = useMemo(
        () => visibleThreads.find((thread) => thread.id === selectedThreadId) ?? selectedDetail?.thread ?? null,
        [selectedDetail?.thread, selectedThreadId, visibleThreads],
    );
    const normalizedThreadSearch = threadSearch.trim().toLowerCase();
    const filteredThreads = useMemo(() => {
        if (!normalizedThreadSearch) {
            return visibleThreads;
        }

        return visibleThreads.filter((thread) => {
            const haystack = [
                thread.counterpartDisplayName,
                thread.counterpartUsername,
                thread.lastMessagePreview,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return haystack.includes(normalizedThreadSearch);
        });
    }, [normalizedThreadSearch, visibleThreads]);
    const showCompactThreadListOnly = isCompactViewport && !selectedThreadId;
    const canComposeFromFollowedCreators = followedCreators.length > 0;
    const selectedThreadIdSet = useMemo(() => new Set(selectedThreadIds), [selectedThreadIds]);
    const liveViewerRole = useMemo(() => resolveChatViewerRole({
        viewerUid: user?.uid || "",
        creatorId,
        profile: userProfile,
    }), [creatorId, user?.uid, userProfile]);

    useEffect(() => {
        selectedThreadIdRef.current = selectedThreadId;
    }, [selectedThreadId]);


    useEffect(() => {
        selectedDetailThreadRef.current = selectedDetail?.thread ?? null;
    }, [selectedDetail?.thread]);


    const loadThreads = useCallback(async (options?: LoadThreadsOptions) => {
        if (!user) {
            return;
        }

        const background = options?.background ?? false;
        const quiet = options?.quiet ?? background;
        const requestId = threadsLoadRequestIdRef.current + 1;
        threadsLoadRequestIdRef.current = requestId;

        if (!background) {
            setThreadsLoading(true);
        }
        try {
            const queryString = creatorId ? `?creatorId=${encodeURIComponent(creatorId)}` : "";
            const response = await authFetch(`/api/chat/threads${queryString}`);
            const rawText = await response.text().catch(() => "");
            let body: ThreadListResponse & { error?: string };
            try {
                body = JSON.parse(rawText) as ThreadListResponse & { error?: string };
            } catch {
                throw new Error(`Chat threads returned non-JSON (${response.status}): ${rawText.slice(0, 150).trim()}`);
            }
            if (!response.ok) {
                throw new Error(body.error || "Failed to load chat threads.");
            }
            if (threadsLoadRequestIdRef.current !== requestId) {
                return;
            }

            const nextThreads = Array.isArray(body.threads) ? body.threads : [];
            setThreads(nextThreads);
            startTransition(() => {
                setSelectedThreadId((current) => {
                    if (current) {
                        return current;
                    }

                    if (body.selectedThreadId) {
                        return body.selectedThreadId;
                    }

                    return isCompactViewport ? null : nextThreads[0]?.id || null;
                });
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
            if (!quiet) {
                toast.error(error instanceof Error ? error.message : "Failed to load chat threads.");
            }
        } finally {
            if (!background) {
                setThreadsLoading(false);
            }
        }
    }, [creatorId, isCompactViewport, user]);

    const loadFollowedCreators = useCallback(async () => {
        if (!user) {
            return;
        }

        try {
            const response = await authFetch("/api/creator/relationships");
            const rawText = await response.text().catch(() => "");
            let body: CreatorRelationshipsListResponse & { error?: string };
            try {
                body = JSON.parse(rawText) as CreatorRelationshipsListResponse & { error?: string };
            } catch {
                throw new Error(`Followed creators returned non-JSON (${response.status}): ${rawText.slice(0, 150).trim()}`);
            }
            if (!response.ok) {
                throw new Error(body.error || "Failed to load followed creators.");
            }

            setFollowedCreators(Array.isArray(body.followedCreators) ? body.followedCreators : []);
        } catch (error) {
            reportClientIssue({
                channel: "runtime",
                severity: "warn",
                message: "Followed creators load failed for chat compose",
                error,
                consoleLabel: "[Chat] followed creators load failed",
            });
            setFollowedCreators([]);
        }
    }, [user]);

    const loadThreadDetail = useCallback(async (threadId: string, options?: LoadThreadDetailOptions) => {
        if (!user) {
            return;
        }

        const background = options?.background ?? false;
        const quiet = options?.quiet ?? background;
        const requestId = threadDetailRequestIdRef.current + 1;
        threadDetailRequestIdRef.current = requestId;
        const keepCurrentDetailVisible = background || selectedDetailThreadRef.current?.id === threadId;

        if (!background) {
            setThreadLoading(true);
        }
        if (!keepCurrentDetailVisible) {
            setSelectedDetail(null);
        }
        if (!background) {
            setInsufficientFunds(null);
            setSendErrorMessage(null);
            setSendWarningMessage(null);
        }
        try {
            const response = await authFetch(`/api/chat/threads/${encodeURIComponent(threadId)}`);
            const rawText = await response.text().catch(() => "");
            let body: ThreadDetailResponse & { error?: string };
            try {
                body = JSON.parse(rawText) as ThreadDetailResponse & { error?: string };
            } catch {
                throw new Error(`Chat thread detail returned non-JSON (${response.status}): ${rawText.slice(0, 150).trim()}`);
            }
            if (!response.ok) {
                throw new Error(body.error || "Failed to load this chat thread.");
            }
            if (threadDetailRequestIdRef.current !== requestId || selectedThreadIdRef.current !== threadId) {
                return;
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
            if (!keepCurrentDetailVisible && selectedThreadIdRef.current === threadId) {
                setSelectedDetail(null);
            }
            if (!quiet) {
                toast.error(error instanceof Error ? error.message : "Failed to load this chat thread.");
            }
        } finally {
            if (!background) {
                setThreadLoading(false);
            }
        }
    }, [user]);

    useEffect(() => {
        void loadThreads();
    }, [loadThreads]);

    useEffect(() => {
        if (!requestedThreadId || requestedThreadId === selectedThreadIdRef.current) {
            return;
        }

        startTransition(() => {
            setSelectedThreadId(requestedThreadId);
        });
    }, [requestedThreadId]);

    useEffect(() => {
        void loadFollowedCreators();
    }, [loadFollowedCreators]);

    useEffect(() => {
        if (!selectedThreadId) {
            setSelectedDetail(null);
            setAttachmentMenuOpen(false);
            return;
        }

        void loadThreadDetail(selectedThreadId);
    }, [loadThreadDetail, selectedThreadId]);

    useEffect(() => {
        if (!attachmentMenuOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) {
                return;
            }

            if (attachmentMenuRef.current?.contains(target)) {
                return;
            }

            setAttachmentMenuOpen(false);
        };

        const handleKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === "Escape") {
                setAttachmentMenuOpen(false);
            }
        };

        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [attachmentMenuOpen]);

    useEffect(() => {
        if (!composePickerOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) {
                return;
            }

            if (composePickerRef.current?.contains(target)) {
                return;
            }

            setComposePickerOpen(false);
        };

        const handleKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === "Escape") {
                setComposePickerOpen(false);
            }
        };

        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [composePickerOpen]);

    useEffect(() => {
        if (!threadEditMenuOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) {
                return;
            }

            if (threadEditMenuRef.current?.contains(target)) {
                return;
            }

            setThreadEditMenuOpen(false);
        };

        const handleKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === "Escape") {
                setThreadEditMenuOpen(false);
            }
        };

        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [threadEditMenuOpen]);

    useEffect(() => {
        const nextHref = buildChatThreadRouteSyncTarget({
            creatorId,
            currentSearch: searchParamsString,
            selectedThreadId,
        });
        if (!nextHref) {
            return;
        }

        router.replace(nextHref, { scroll: false });
    }, [creatorId, router, searchParamsString, selectedThreadId]);

    useEffect(() => {
        setSelectedThreadIds((current) => current.filter((threadId) => visibleThreads.some((thread) => thread.id === threadId)));
    }, [visibleThreads]);
    useEffect(() => {
        if (!user || !userProfile) {
            return;
        }

        const viewerField = liveViewerRole === "creator" ? "creatorId" : "userId";
        let active = true;

        const observerControl = createAutoHealingObserver(() => {
            if (!active) return;
            return onSnapshot(
                query(collection(db, CHAT_COLLECTIONS.threads), where(viewerField, "==", user.uid)),
                (snapshot) => {
                    if (!active) {
                        return;
                    }
                    const nextThreads = snapshot.docs.map((docSnapshot) => {
                        const raw = docSnapshot.data() as ChatThreadRecord;
                        const threadId = docSnapshot.id;
                        const viewerRole = raw.creatorId === user.uid ? "creator" : "user";
                        return {
                            ...raw,
                            id: threadId,
                            lastMessagePreview: softOpenChatValue(
                                buildChatSoftSealScope(threadId, "preview"),
                                raw.lastMessagePreview,
                            ) || "New message",
                            counterpartId: viewerRole === "creator" ? raw.userId : raw.creatorId,
                            counterpartDisplayName: viewerRole === "creator"
                                ? (raw.userDisplayName || raw.userUsername || raw.userId)
                                : (raw.creatorDisplayName || raw.creatorUsername || raw.creatorId),
                            counterpartUsername: viewerRole === "creator" ? raw.userUsername : raw.creatorUsername,
                            counterpartPhotoURL: viewerRole === "creator" ? (raw.userPhotoURL ?? null) : (raw.creatorPhotoURL ?? null),
                            viewerRole,
                            unreadCount: resolveChatThreadUnreadCount(raw, viewerRole),
                            readAt: resolveChatThreadReadAt(raw, viewerRole),
                            counterpartReadAt: resolveChatThreadReadAt(raw, viewerRole === "creator" ? "user" : "creator"),
                        } satisfies ChatThreadRecord;
                    })
                        .filter((thread) => isChatThreadVisibleToViewer(thread, thread.viewerRole))
                        .sort((left, right) => right.lastMessageAt - left.lastMessageAt);

                    setThreads((current) => mergeThreads(
                        nextThreads,
                        selectedDetailThreadRef.current ?? current.find((thread) => thread.id === selectedThreadIdRef.current) ?? null,
                    ));
                },
                (error: unknown) => {
                    if (!active) return;
                    observerControl.triggerReconnect(error);
                },
            );
        }, (error: unknown) => {
            reportRealtimeIssue(CHAT_THREAD_LIST_SCOPE, error, {
                creatorId: creatorId || null,
            });
        });

        return () => {
            active = false;
            observerControl.cleanup();
        };
    }, [creatorId, liveViewerRole, user, userProfile]);

    useEffect(() => {
        if (!selectedThreadId || !user || !userProfile) {
            return;
        }
        const viewerField = liveViewerRole === "creator" ? "creatorId" : "userId";
        let active = true;

        const observerControl = createAutoHealingObserver(() => {
            if (!active) return;
            return onSnapshot(
                query(
                    collection(db, CHAT_COLLECTIONS.messages),
                    where("threadId", "==", selectedThreadId),
                    where(viewerField, "==", user.uid)
                ),
                (snapshot) => {
                    if (!active) return;
                    const nextMessages = snapshot.docs
                        .map((docSnapshot) => {
                            const raw = docSnapshot.data() as ThreadDetailResponse["messages"][number];
                            return {
                                ...raw,
                                id: docSnapshot.id,
                                text: softOpenChatValue(buildChatSoftSealScope(selectedThreadId, "text"), raw.text) ?? undefined,
                                assetUrl: softOpenChatValue(buildChatSoftSealScope(selectedThreadId, "assetUrl"), raw.assetUrl) ?? undefined,
                                assetName: softOpenChatValue(buildChatSoftSealScope(selectedThreadId, "assetName"), raw.assetName) ?? undefined,
                            };
                        })
                        .sort((left, right) => (left.createdAt || 0) - (right.createdAt || 0));
    
                    setSelectedDetail((current) => current ? {
                        ...current,
                        messages: nextMessages,
                    } : current);
                },
                (error: unknown) => {
                    if (!active) return;
                    observerControl.triggerReconnect(error);
                },
            );
        }, (error: unknown) => {
            reportRealtimeIssue(CHAT_MESSAGES_SCOPE, error, {
                threadId: selectedThreadId,
            });
        });

        return () => {
            active = false;
            observerControl.cleanup();
        };
    }, [liveViewerRole, selectedThreadId, user, userProfile]);

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

    const openThreadComposer = useCallback((nextCreatorId: string) => {
        setComposePickerOpen(false);
        setSelectedThreadId(null);
        setSelectedDetail(null);
        router.replace(`/dashboard/chat?creator=${encodeURIComponent(nextCreatorId)}`, { scroll: false });
    }, [router]);

    const returnToThreadList = useCallback(() => {
        setSelectedThreadId(null);
        setComposePickerOpen(false);
        router.replace("/dashboard/chat", { scroll: false });
    }, [router]);

    const enterThreadSelectionMode = useCallback(() => {
        setThreadEditMenuOpen(false);
        setThreadSelectionMode(true);
        setSelectedThreadIds([]);
    }, []);

    const exitThreadSelectionMode = useCallback(() => {
        setThreadEditMenuOpen(false);
        setThreadSelectionMode(false);
        setSelectedThreadIds([]);
    }, []);

    const toggleThreadSelection = useCallback((threadId: string) => {
        setSelectedThreadIds((current) => current.includes(threadId)
            ? current.filter((entry) => entry !== threadId)
            : [...current, threadId]);
    }, []);

    const handleMarkThreadsRead = useCallback(async () => {
        const targetIds = selectedThreadIds.length > 0
            ? selectedThreadIds
            : filteredThreads.map((thread) => thread.id);
        if (targetIds.length === 0) {
            return;
        }

        setEditingThreads(true);
        try {
            const results = await Promise.allSettled(targetIds.map(async (threadId) => {
                const response = await authFetch(`/api/chat/threads/${encodeURIComponent(threadId)}/read`, {
                    method: "POST",
                });
                if (!response.ok) {
                    throw new Error("Chat read update failed.");
                }
            }));
            const failedCount = results.filter((result) => result.status === "rejected").length;
            setThreads((current) => current.map((thread) => targetIds.includes(thread.id)
                ? {
                    ...thread,
                    unreadCount: 0,
                    readAt: Math.max(Date.now(), thread.lastMessageAt || 0),
                }
                : thread));
            exitThreadSelectionMode();
            if (failedCount > 0) {
                toast.error(`Failed to mark ${failedCount} conversation${failedCount === 1 ? "" : "s"} as read.`);
            }
        } finally {
            setEditingThreads(false);
        }
    }, [exitThreadSelectionMode, filteredThreads, selectedThreadIds]);

    const handleDeleteThreads = useCallback(async () => {
        if (selectedThreadIds.length === 0) {
            return;
        }

        setEditingThreads(true);
        try {
            const results = await Promise.allSettled(selectedThreadIds.map(async (threadId) => {
                const response = await authFetch(`/api/chat/threads/${encodeURIComponent(threadId)}`, {
                    method: "DELETE",
                });
                if (!response.ok) {
                    throw new Error("Chat delete failed.");
                }
            }));
            const failedCount = results.filter((result) => result.status === "rejected").length;
            if (failedCount === selectedThreadIds.length) {
                throw new Error("Failed to delete the selected conversations.");
            }

            setThreads((current) => current.filter((thread) => !selectedThreadIds.includes(thread.id)));
            exitThreadSelectionMode();
            if (failedCount > 0) {
                toast.error(`Deleted conversations with ${failedCount} failure${failedCount === 1 ? "" : "s"}.`);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete the selected conversations.");
        } finally {
            setEditingThreads(false);
        }
    }, [exitThreadSelectionMode, selectedThreadIds]);

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
        setAttachmentMenuOpen(false);
        if (!file) {
            setComposerFile(null);
            setComposerKind("text");
            return;
        }

        const attachmentKind = resolveChatAttachmentKind(file.type);
        if (!attachmentKind) {
            setComposerFile(null);
            setComposerKind("text");
            setSendErrorMessage("Only image and video files can be attached in chat.");
            toast.error("Only image and video files can be attached in chat.");
            return;
        }

        setComposerFile(file);
        setComposerKind(attachmentKind);
    }, []);

    const openImagePicker = useCallback(() => {
        setAttachmentMenuOpen(false);
        imageInputRef.current?.click();
    }, []);

    const openVideoPicker = useCallback(() => {
        setAttachmentMenuOpen(false);
        videoInputRef.current?.click();
    }, []);

    const discardUploadedAttachment = useCallback(async (storagePath: string) => {
        if (!user || !selectedThreadId || !storagePath) {
            return true;
        }

        try {
            const response = await authFetch("/api/chat/attachments/cancel", {
                method: "POST",
                body: JSON.stringify({
                    threadId: selectedThreadId,
                    storagePath,
                }),
            });
            const rawText = await response.text().catch(() => "");
            let body: { error?: string };
            try {
                body = JSON.parse(rawText) as { error?: string };
            } catch {
                throw new Error(`Attachment cleanup returned non-JSON (${response.status}): ${rawText.slice(0, 150).trim()}`);
            }
            if (!response.ok) {
                throw new Error(body.error || "Failed to clean up chat attachment.");
            }

            return true;
        } catch (error) {
            reportStorageIssue("chat attachment cleanup", error, {
                storagePath,
                threadId: selectedThreadId,
            });
            return false;
        }
    }, [selectedThreadId, user]);

    const uploadAttachment = useCallback(async (): Promise<UploadedChatAttachment | null> => {
        if (!composerFile || !user || !selectedThreadId) {
            return null;
        }

        const attachmentKind = resolveChatAttachmentKind(composerFile.type);
        if (!attachmentKind) {
            throw new Error("Only image and video files can be attached in chat.");
        }

        let preparedStoragePath: string | null = null;
        try {
            const prepareResponse = await authFetch("/api/chat/attachments/prepare", {
                method: "POST",
                body: JSON.stringify({
                    threadId: selectedThreadId,
                    fileName: composerFile.name,
                    mimeType: composerFile.type || "application/octet-stream",
                    sizeBytes: composerFile.size,
                }),
            });
            let prepareBody = {} as { error?: string } & Partial<ChatAttachmentPrepareResponse>;
            const prepareRawText = await prepareResponse.text().catch(() => "");
            try {
                prepareBody = JSON.parse(prepareRawText) as typeof prepareBody;
            } catch {
                throw new Error(`Prepare API returned non-JSON (${prepareResponse.status}): ${prepareRawText.slice(0, 150).trim()}`);
            }
            if (!prepareResponse.ok || !prepareBody.storagePath) {
                throw new Error(prepareBody.error || "Failed to prepare chat attachment upload.");
            }
            preparedStoragePath = prepareBody.storagePath;

            const target = storageRef(storage, prepareBody.storagePath);
            await uploadBytes(target, composerFile, {
                contentType: prepareBody.mimeType || composerFile.type || "application/octet-stream",
            });

            const completeResponse = await authFetch("/api/chat/attachments/complete", {
                method: "POST",
                body: JSON.stringify({
                    threadId: selectedThreadId,
                    storagePath: prepareBody.storagePath,
                    fileName: prepareBody.fileName || composerFile.name,
                    mimeType: prepareBody.mimeType || composerFile.type || "application/octet-stream",
                }),
            });
            let completeBody = {} as { error?: string } & Partial<ChatAttachmentCompleteResponse>;
            const completeRawText = await completeResponse.text().catch(() => "");
            try {
                completeBody = JSON.parse(completeRawText) as typeof completeBody;
            } catch {
                throw new Error(`Complete API returned non-JSON (${completeResponse.status}): ${completeRawText.slice(0, 150).trim()}`);
            }
            if (!completeResponse.ok || !completeBody.assetUrl) {
                throw new Error(completeBody.error || "Failed to finalize chat attachment.");
            }

            return {
                assetUrl: completeBody.assetUrl,
                assetName: completeBody.assetName || composerFile.name,
                assetMimeType: completeBody.assetMimeType || composerFile.type || "application/octet-stream",
                storagePath: completeBody.storagePath || prepareBody.storagePath,
            };
        } catch (error) {
            if (preparedStoragePath) {
                await discardUploadedAttachment(preparedStoragePath);
            }
            reportStorageIssue("chat attachment upload", error, {
                fileName: composerFile.name,
                mimeType: composerFile.type,
                threadId: selectedThreadId,
                storagePath: preparedStoragePath,
            });
            throw error;
        }
    }, [composerFile, discardUploadedAttachment, selectedThreadId, user]);

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
        setSendWarningMessage(null);

        const currentComposerText = composerText.trim();
        const currentComposerFile = composerFile;
        const currentComposerKind = composerKind;
        let uploadedAttachment: UploadedChatAttachment | null = null;

        const optimisticId = `optimistic-${Date.now()}`;
        if (!currentComposerFile) {
            setSelectedDetail((current) => current ? {
                ...current,
                messages: [
                    ...current.messages,
                    {
                        id: optimisticId,
                        threadId: selectedThreadId,
                        creatorId: selectedThread.creatorId,
                        userId: selectedThread.userId,
                        senderRole: selectedThread.viewerRole,
                        messageKind: currentComposerKind,
                        text: currentComposerText,
                        createdAt: Date.now(),
                        costGd: 0,
                    } as ThreadDetailResponse["messages"][number],
                ],
            } : current);
            setComposerText("");
            setComposerKind("text");
            pushTypingState(false);
        }

        try {
            uploadedAttachment = await uploadAttachment();
            const response = await authFetch(`/api/chat/threads/${encodeURIComponent(selectedThreadId)}/messages`, {
                method: "POST",
                body: JSON.stringify({
                    text: currentComposerText,
                    messageKind: uploadedAttachment
                        ? (resolveChatAttachmentKind(uploadedAttachment.assetMimeType) || currentComposerKind)
                        : currentComposerKind,
                    ...(uploadedAttachment ? {
                        assetUrl: uploadedAttachment.assetUrl,
                        assetName: uploadedAttachment.assetName,
                        assetMimeType: uploadedAttachment.assetMimeType,
                    } : {}),
                }),
            });
            let body = {} as ChatSendResponse;
            const rawResponse = await response.text().catch(() => "");
            try {
                body = JSON.parse(rawResponse) as ChatSendResponse;
            } catch (jsonParseError) {
                throw new Error(`Server returned a non-JSON response (${response.status}). This suggests a Vercel runtime crash: ${rawResponse.slice(0, 150).trim()}`);
            }

            if (!response.ok) {
                if (body.errorCode === "insufficient_paid_gumdrops") {
                    if (!currentComposerFile) {
                        setSelectedDetail((current) => current ? {
                            ...current,
                            messages: current.messages.filter((msg) => msg.id !== optimisticId),
                        } : current);
                    }
                    setInsufficientFunds(body as ChatInsufficientFundsPayload);
                    return;
                }

                throw new Error(buildChatSendErrorMessage(body));
            }

            if (currentComposerFile) {
                setComposerText("");
                setComposerFile(null);
                setComposerKind("text");
                pushTypingState(false);
            }
            if (body.message && body.thread) {
                const persistedMessage = body.message;
                const persistedThread = body.thread;
                setSelectedDetail((current) => reconcileChatSendSuccess(current, {
                    thread: persistedThread,
                    message: persistedMessage,
                    pricing: body.pricing,
                    optimisticMessageId: currentComposerFile ? null : optimisticId,
                }));
                setThreads((current) => mergeThreads(
                    current.map((thread) => thread.id === persistedThread.id ? persistedThread : thread),
                    persistedThread,
                ));
            }
            const warningMessage = buildChatSendWarningMessage(body.warnings);
            if (warningMessage) {
                setSendWarningMessage(warningMessage);
            }
        } catch (error) {
            let cleanupFailed = false;
            if (uploadedAttachment?.storagePath) {
                cleanupFailed = !(await discardUploadedAttachment(uploadedAttachment.storagePath));
            }
            if (!currentComposerFile) {
                setSelectedDetail((current) => current ? {
                    ...current,
                    messages: current.messages.filter((msg) => msg.id !== optimisticId),
                } : current);
                setComposerText(currentComposerText);
            }
            const message = cleanupFailed
                ? `${error instanceof Error ? error.message : "Failed to send message."} The uploaded attachment could not be cleaned up automatically, and this was logged.`
                : (error instanceof Error ? error.message : "Failed to send message.");
            setSendErrorMessage(message);
            reportClientIssue({
                channel: "ui",
                severity: "warn",
                message: "Chat message send failed",
                error,
                detail: {
                    threadId: selectedThreadId,
                    messageKind: currentComposerKind,
                    hasAttachment: Boolean(currentComposerFile),
                    attachmentCleanupFailed: cleanupFailed,
                },
                consoleLabel: "[Chat] send message failed",
            });
            toast.error(message);
        } finally {
            setSendingMessage(false);
        }
    }, [composerFile, composerKind, composerText, discardUploadedAttachment, pushTypingState, selectedThread, selectedThreadId, uploadAttachment]);

    const handleComposerKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (!sendingMessage) {
                void handleSendMessage();
            }
        }
    }, [handleSendMessage, sendingMessage]);

    const latestOutgoingMessageId = useMemo(() => {
        if (!selectedDetail) {
            return null;
        }

        const viewerRole = selectedDetail.thread.viewerRole;
        const outgoing = [...selectedDetail.messages].reverse().find((message) => message.senderRole === viewerRole);
        return outgoing?.id ?? null;
    }, [selectedDetail]);
    const latestMessageSnapshot = useMemo(() => {
        const latestMessage = selectedDetail?.messages[selectedDetail.messages.length - 1];
        if (!latestMessage) {
            return null;
        }

        return `${latestMessage.id}:${latestMessage.createdAt}`;
    }, [selectedDetail]);

    const scrollMessageListToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        const node = messageListRef.current;
        if (!node) {
            return;
        }

        node.scrollTo({
            top: node.scrollHeight,
            behavior,
        });
    }, []);

    const handleMessageListScroll = useCallback(() => {
        const node = messageListRef.current;
        if (!node) {
            return;
        }

        const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
        shouldStickToBottomRef.current = distanceFromBottom < 72;
    }, []);

    useEffect(() => {
        if (!selectedThread || !selectedDetail) {
            return;
        }

        setSelectedDetail((current) => {
            if (!current || current.thread.id !== selectedThread.id || current.thread === selectedThread) {
                return current;
            }

            return {
                ...current,
                thread: selectedThread,
            };
        });
    }, [selectedDetail, selectedThread]);

    useEffect(() => {
        shouldStickToBottomRef.current = true;
        window.requestAnimationFrame(() => {
            scrollMessageListToBottom("auto");
        });
    }, [scrollMessageListToBottom, selectedThreadId]);

    useEffect(() => {
        if (!selectedDetail?.messages.length || !selectedThread) {
            return;
        }

        const latestMessage = selectedDetail.messages[selectedDetail.messages.length - 1];
        if (shouldStickToBottomRef.current || latestMessage.senderRole === selectedThread.viewerRole) {
            window.requestAnimationFrame(() => {
                scrollMessageListToBottom(shouldStickToBottomRef.current ? "smooth" : "auto");
            });
        }
    }, [latestMessageSnapshot, scrollMessageListToBottom, selectedDetail?.messages, selectedThread]);

    const composerSummary = useMemo(
        () => renderPriceSummary(selectedDetail, selectedThread?.viewerRole ?? "user"),
        [selectedDetail, selectedThread?.viewerRole],
    );

    if (!user || !userProfile) {
        return null;
    }

    return (
        <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 overflow-hidden px-0 sm:px-4">
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-[0_26px_80px_rgba(0,0,0,0.55)]">
                <div className="grid h-full min-h-0 lg:grid-cols-[320px_minmax(0,1fr)]">
                    {(!isCompactViewport || !selectedThreadId) ? (
                        <aside className={cn(
                            "min-h-0 bg-[#050505]",
                            showCompactThreadListOnly
                                ? "relative h-full overflow-hidden"
                                : "flex min-h-0 flex-col border-b border-white/10 lg:border-b-0 lg:border-r lg:border-r-white/10",
                        )}>
                            {showCompactThreadListOnly ? (
                                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                                    <div className="px-5 pb-4 pt-6">
                                        <div className="flex items-center justify-between">
                                            <div ref={threadEditMenuRef} className="relative">
                                                {threadSelectionMode ? (
                                                    <button
                                                        type="button"
                                                        onClick={exitThreadSelectionMode}
                                                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#4d9cff] text-white shadow-[0_18px_32px_rgba(77,156,255,0.35)] transition hover:bg-[#68a9ff]"
                                                        aria-label="Done selecting chats"
                                                    >
                                                        <Check className="h-5 w-5" />
                                                    </button>
                                                ) : visibleThreads.length > 0 ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setThreadEditMenuOpen((current) => !current)}
                                                            className="rounded-full bg-[#141417] px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/8 transition hover:bg-[#1b1c20]"
                                                            aria-expanded={threadEditMenuOpen}
                                                            aria-haspopup="menu"
                                                        >
                                                            Edit
                                                        </button>
                                                        {threadEditMenuOpen ? (
                                                            <div
                                                                role="menu"
                                                                aria-label="Edit message list"
                                                                className="absolute left-0 top-full z-20 mt-3 w-52 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#141417]/95 p-2 shadow-[0_24px_48px_rgba(0,0,0,0.5)] backdrop-blur"
                                                            >
                                                                <button
                                                                    type="button"
                                                                    role="menuitem"
                                                                    onClick={enterThreadSelectionMode}
                                                                    className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-white transition hover:bg-white/5"
                                                                >
                                                                    <Circle className="h-4 w-4" />
                                                                    <span>Select chats</span>
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="mt-5">
                                            <p className="text-4xl font-black tracking-[-0.04em] text-white">Messages</p>
                                            <p className="mt-2 text-sm text-[#8f9097]">
                                                {threadsLoading ? "Loading your conversations..." : `${visibleThreads.length} conversation${visibleThreads.length === 1 ? "" : "s"}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-[calc(8.5rem+env(safe-area-inset-bottom))]">
                                        {filteredThreads.length > 0 ? (
                                            <div className="space-y-1">
                                                {filteredThreads.map((thread) => (
                                                    <button
                                                        key={thread.id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (threadSelectionMode) {
                                                                toggleThreadSelection(thread.id);
                                                                return;
                                                            }

                                                            startTransition(() => setSelectedThreadId(thread.id));
                                                        }}
                                                        className="flex w-full items-center gap-3 rounded-[1.35rem] px-1 py-3 text-left transition hover:bg-white/[0.03]"
                                                    >
                                                        {threadSelectionMode ? (
                                                            <span className={cn(
                                                                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                                                                selectedThreadIdSet.has(thread.id)
                                                                    ? "border-[#4d9cff] bg-[#4d9cff] text-white"
                                                                    : "border-white/20 bg-transparent text-transparent",
                                                            )}>
                                                                <Check className="h-3.5 w-3.5" />
                                                            </span>
                                                        ) : null}
                                                        <ChatAvatar
                                                            photoURL={thread.counterpartPhotoURL}
                                                            label={thread.counterpartDisplayName}
                                                            sizeClassName="h-12 w-12"
                                                            textClassName="text-sm"
                                                        />
                                                        <div className="min-w-0 flex-1 border-b border-white/6 pb-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-[15px] font-semibold text-white">{thread.counterpartDisplayName}</p>
                                                                    <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[#8f9097]">
                                                                        {thread.lastMessagePreview || "No messages yet"}
                                                                    </p>
                                                                </div>
                                                                <div className="flex shrink-0 items-center gap-2 pl-2">
                                                                    <span className="text-[11px] font-medium text-[#7f8087]">
                                                                        {formatThreadListTime(thread.lastMessageAt)}
                                                                    </span>
                                                                    {thread.unreadCount > 0 ? (
                                                                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-brand-purple" />
                                                                    ) : null}
                                                                    {!threadSelectionMode ? (
                                                                        <ChevronRight className="h-4 w-4 text-[#63646b]" />
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : visibleThreads.length > 0 ? (
                                            <div className="flex min-h-[44vh] flex-col items-center justify-center text-center">
                                                <p className="text-lg font-semibold text-white">No conversations match that search.</p>
                                                <p className="mt-2 max-w-sm text-sm leading-6 text-[#8f9097]">
                                                    Try a different name or clear the search field to see your full thread list.
                                                </p>
                                            </div>
                                        ) : canComposeFromFollowedCreators ? (
                                            <div className="flex min-h-[44vh] flex-col items-center justify-center text-center">
                                                <div className="rounded-full bg-[#141417] p-4 text-brand-purple ring-1 ring-white/8">
                                                    <MessageSquare className="h-8 w-8" />
                                                </div>
                                                <p className="mt-5 text-2xl font-black text-white">No messages yet</p>
                                                <p className="mt-2 max-w-sm text-sm leading-6 text-[#8f9097]">
                                                    Start your first chat with a creator you already follow.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setComposePickerOpen(true)}
                                                    className="mt-5 rounded-full bg-brand-purple px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8457ff]"
                                                >
                                                    Compose a message
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex min-h-[44vh] flex-col items-center justify-center text-center">
                                                <div className="rounded-full bg-[#141417] p-4 text-brand-purple ring-1 ring-white/8">
                                                    <MessageSquare className="h-8 w-8" />
                                                </div>
                                                <p className="mt-5 text-2xl font-black text-white">No creators followed yet</p>
                                                <p className="mt-2 max-w-sm text-sm leading-6 text-[#8f9097]">
                                                    Follow creators first so you can start messaging them from this inbox.
                                                </p>
                                                <Link
                                                    href="/experiences"
                                                    className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#e8e8ea]"
                                                >
                                                    Follow more creators
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {threadSelectionMode ? (
                                        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                                            <div className="pointer-events-auto flex items-center justify-between">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleMarkThreadsRead()}
                                                    disabled={editingThreads || filteredThreads.length === 0}
                                                    className={cn(
                                                        "rounded-full px-4 py-2.5 text-sm font-semibold transition",
                                                        editingThreads || filteredThreads.length === 0
                                                            ? "bg-[#1a1a1d] text-[#5f6067]"
                                                            : "bg-[#1a1a1d] text-white hover:bg-[#25262a]",
                                                    )}
                                                >
                                                    Read All
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDeleteThreads()}
                                                    disabled={editingThreads || selectedThreadIds.length === 0}
                                                    className={cn(
                                                        "inline-flex h-11 w-11 items-center justify-center rounded-full transition",
                                                        editingThreads || selectedThreadIds.length === 0
                                                            ? "bg-[#1a1a1d] text-[#5f6067]"
                                                            : "bg-[#1a1a1d] text-white hover:bg-[#25262a]",
                                                    )}
                                                    aria-label="Delete selected chats"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                                            <div className="pointer-events-auto mx-auto max-w-md rounded-full bg-[#121214] px-4 py-3 ring-1 ring-white/8">
                                                <div className="flex items-center gap-3">
                                                    <Search className="h-4 w-4 text-[#6e7077]" />
                                                    <input
                                                        value={threadSearch}
                                                        onChange={(event) => setThreadSearch(event.target.value)}
                                                        placeholder="Search"
                                                        className="w-full bg-transparent text-base text-white placeholder:text-[#6e7077] focus:outline-none sm:text-sm"
                                                    />
                                                </div>
                                            </div>
                                            {canComposeFromFollowedCreators ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setComposePickerOpen(true)}
                                                    className="pointer-events-auto absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-purple text-white shadow-[0_18px_36px_rgba(111,63,244,0.36)] transition hover:bg-[#8457ff]"
                                                    aria-label="Compose message"
                                                >
                                                    <SquarePen className="h-5 w-5" />
                                                </button>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="border-b border-white/10 px-4 py-4 sm:px-5">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7f7f86]">Chat</p>
                                        <p className="mt-1 text-sm text-[#b6b6bc]">
                                            {threadsLoading ? "Loading live threads..." : `${visibleThreads.length} conversation${visibleThreads.length === 1 ? "" : "s"}`}
                                        </p>
                                    </div>
                                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                                        {visibleThreads.length > 0 ? visibleThreads.map((thread) => (
                                            <button
                                                key={thread.id}
                                                type="button"
                                                onClick={() => startTransition(() => setSelectedThreadId(thread.id))}
                                                className={cn(
                                                    "flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors sm:px-5",
                                                    selectedThreadId === thread.id
                                                        ? "bg-[linear-gradient(90deg,rgba(123,63,255,0.18)_0%,rgba(255,255,255,0)_85%)]"
                                                        : "hover:bg-white/[0.03]",
                                                )}
                                            >
                                                <ChatAvatar
                                                    photoURL={thread.counterpartPhotoURL}
                                                    label={thread.counterpartDisplayName}
                                                    sizeClassName="h-11 w-11"
                                                    textClassName="text-sm"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-white">{thread.counterpartDisplayName}</p>
                                                            <p className="truncate text-xs text-[#7e7f87]">
                                                                {thread.counterpartUsername ? `@${thread.counterpartUsername}` : thread.counterpartId}
                                                            </p>
                                                        </div>
                                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                                            <span className="text-[11px] text-[#6b6c73]">{thread.lastMessageAt ? formatRelativeTime(thread.lastMessageAt) : "New"}</span>
                                                            {thread.unreadCount > 0 ? (
                                                                <span className="rounded-full bg-brand-purple px-2 py-0.5 text-[10px] font-semibold text-white">{thread.unreadCount}</span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <p className="mt-1 line-clamp-1 text-sm text-[#b6b6bc]">{thread.lastMessagePreview || "No messages yet"}</p>
                                                </div>
                                            </button>
                                        )) : (
                                            <div className="px-4 py-10 text-sm text-[#8f9097] sm:px-5">
                                                No chat threads yet. Start from a creator page to open the first one.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </aside>
                    ) : null}

                    {!showCompactThreadListOnly ? (
                        <section className="flex h-full min-h-0 flex-col bg-[#000000]">
                        {selectedThread ? (
                            <>
                                <div className="border-b border-white/10 px-4 pb-4 pt-5 sm:px-6">
                                    <div className={cn("relative flex items-center", isCompactViewport ? "justify-center" : "justify-between")}>
                                        {isCompactViewport ? (
                                            <button
                                                type="button"
                                                onClick={returnToThreadList}
                                                className="absolute left-0 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#161618] text-white transition hover:bg-[#202024]"
                                                aria-label="Back to chat list"
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                            </button>
                                        ) : null}
                                        <div className="flex items-center gap-3 rounded-full bg-[#141417] px-3 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.3)] ring-1 ring-white/8">
                                            <ChatAvatar
                                                photoURL={selectedThread.counterpartPhotoURL}
                                                label={selectedThread.counterpartDisplayName}
                                                sizeClassName="h-12 w-12"
                                                textClassName="text-sm"
                                            />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-white">{selectedThread.counterpartDisplayName}</p>
                                                <p className="truncate text-xs text-[#8f9097]">
                                                    {selectedThread.counterpartUsername ? `@${selectedThread.counterpartUsername}` : "Direct chat"}
                                                </p>
                                            </div>
                                        </div>
                                        {!isCompactViewport ? (
                                            <div className="text-right">
                                                <p className="text-xs font-medium text-white">Realtime thread</p>
                                                <TypingStatus
                                                    presence={presence}
                                                    fallback={selectedThread.lastMessageAt ? `Last message ${formatRelativeTime(selectedThread.lastMessageAt)}` : "No messages yet"}
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                    {isCompactViewport ? (
                                        <div className="mt-3 flex justify-center">
                                            <TypingStatus
                                                presence={presence}
                                                fallback={selectedThread.lastMessageAt ? `Last message ${formatRelativeTime(selectedThread.lastMessageAt)}` : "No messages yet"}
                                            />
                                        </div>
                                    ) : null}
                                </div>

                                <div
                                    ref={messageListRef}
                                    onScroll={handleMessageListScroll}
                                    className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-black px-4 pb-5 pt-4 sm:px-6"
                                >
                                    {threadLoading && !selectedDetail ? (
                                        <div className="text-sm text-[#b6b6bc]">Loading thread...</div>
                                    ) : selectedDetail?.messages.length ? selectedDetail.messages.map((message, index) => {
                                        const previousMessage = selectedDetail.messages[index - 1];
                                        const isOutgoing = message.senderRole === selectedThread.viewerRole;
                                        const isLatestOutgoing = message.id === latestOutgoingMessageId;
                                        const isOptimistic = message.id.startsWith("optimistic-");
                                        const showTimelineMarker = shouldRenderTimelineMarker(message, previousMessage);
                                        const showStatus = isOutgoing && (isLatestOutgoing || isOptimistic);
                                        const readState = isOptimistic
                                            ? "Sending..."
                                            : isLatestOutgoing && selectedThread.counterpartReadAt >= message.createdAt
                                                ? "Read"
                                                : "Sent";

                                        return (
                                            <div key={message.id} className={cn(index === 0 ? "" : "mt-1")}>
                                                {showTimelineMarker ? (
                                                    <div className="mb-4 flex justify-center">
                                                        <span className="rounded-full bg-[#141417] px-3 py-1 text-[11px] font-medium text-[#8f9097]">
                                                            {formatTimelineLabel(message.createdAt)}
                                                        </span>
                                                    </div>
                                                ) : null}
                                                <div className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}>
                                                    <div className="max-w-[84%] sm:max-w-[72%]">
                                                        <div className={cn(
                                                            "overflow-hidden px-4 py-3 text-[15px] leading-6 shadow-[0_12px_30px_rgba(0,0,0,0.22)]",
                                                            isOutgoing
                                                                ? "rounded-[1.45rem] rounded-br-[0.5rem] bg-[linear-gradient(180deg,#8f6dff_0%,#6f3ff4_100%)] text-white"
                                                                : "rounded-[1.45rem] rounded-bl-[0.5rem] bg-[#26262a] text-white",
                                                            message.assetUrl && !message.text ? "p-1.5" : "",
                                                            isOptimistic ? "opacity-75" : "",
                                                        )}>
                                                            {message.text ? <p className="whitespace-pre-wrap break-words">{message.text}</p> : null}
                                                            {message.assetUrl ? (
                                                                <div className={cn(message.text ? "mt-3" : "")}>
                                                                    <div className={cn(
                                                                        "overflow-hidden rounded-[1.15rem]",
                                                                        isOutgoing ? "bg-[#5b2fdd]" : "bg-[#1a1a1d]",
                                                                    )}>
                                                                        {isImageAttachment(message.assetMimeType, message.assetUrl) ? (
                                                                            // eslint-disable-next-line @next/next/no-img-element
                                                                            <img src={message.assetUrl} alt="" className="h-auto w-full object-cover" />
                                                                        ) : isVideoAttachment(message.assetMimeType, message.assetUrl) ? (
                                                                            <video src={message.assetUrl} controls className="h-auto w-full" />
                                                                        ) : (
                                                                            <a
                                                                                href={message.assetUrl}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="block px-4 py-3 text-sm font-medium text-white underline"
                                                                            >
                                                                                Open attachment
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                        {showStatus ? (
                                                            <div className="mt-1 px-3 text-right text-[11px] font-medium text-[#7f8087]">
                                                                {readState}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="flex h-full min-h-[320px] items-center justify-center">
                                            <div className="rounded-[1.4rem] bg-[#121214] px-4 py-3 text-sm text-[#b6b6bc] ring-1 ring-white/8">
                                                No messages yet. This thread is ready when you are.
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.92)_18%,#000_100%)] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4">
                                    {sendErrorMessage ? (
                                        <div className="rounded-[1.2rem] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-white">Message failed</p>
                                                    <p className="mt-1 leading-6 text-rose-100">{sendErrorMessage}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSendErrorMessage(null)}
                                                    className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-200"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                    {sendWarningMessage ? (
                                        <div className="mt-3 rounded-[1.2rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-white">Message sent with warning</p>
                                                    <p className="mt-1 leading-6 text-amber-100">{sendWarningMessage}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSendWarningMessage(null)}
                                                    className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                    <div className={cn(sendErrorMessage || sendWarningMessage ? "mt-3" : "")}>
                                        <InsufficientFundsCard
                                            payload={insufficientFunds}
                                            onClose={() => setInsufficientFunds(null)}
                                            onPurchase={() => openPurchaseModal(insufficientFunds?.paidGdShortfall)}
                                        />
                                    </div>
                                    {composerFile ? (
                                        <div className="mt-3 flex items-center justify-between rounded-[1.1rem] bg-[#121214] px-4 py-3 text-sm text-white ring-1 ring-white/8">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{composerFile.name}</p>
                                                <p className="truncate text-xs text-[#8f9097]">
                                                    {composerFile.type.startsWith("video/") ? "Video attachment" : "Image attachment"}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setComposerFile(null);
                                                    setComposerKind("text");
                                                }}
                                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-[#b6b6bc] transition hover:bg-white/10 hover:text-white"
                                                aria-label="Remove attachment"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : null}
                                    {composerSummary ? (
                                        <div className="mt-3 text-[11px] text-[#7f8087]">{composerSummary}</div>
                                    ) : null}
                                    <div className="mt-3 flex items-center gap-3">
                                        <div ref={attachmentMenuRef} className="relative shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setAttachmentMenuOpen((current) => !current)}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#141417] text-white transition hover:bg-[#1a1b1f]"
                                                aria-label="Add attachment"
                                                aria-expanded={attachmentMenuOpen}
                                                aria-haspopup="menu"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                            {attachmentMenuOpen ? (
                                                <div
                                                    role="menu"
                                                    aria-label="Attachment options"
                                                    className="absolute bottom-full left-0 z-20 mb-3 w-44 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#151518]/95 p-2 shadow-[0_24px_48px_rgba(0,0,0,0.45)] backdrop-blur"
                                                >
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={openImagePicker}
                                                        className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-white transition hover:bg-white/5"
                                                    >
                                                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-purple/18 text-brand-purple">
                                                            <ImageIcon className="h-4 w-4" />
                                                        </span>
                                                        <span>Image</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={openVideoPicker}
                                                        className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-white transition hover:bg-white/5"
                                                    >
                                                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white">
                                                            <Video className="h-4 w-4" />
                                                        </span>
                                                        <span>Video</span>
                                                    </button>
                                                </div>
                                            ) : null}
                                            <input
                                                ref={imageInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(event) => {
                                                    handleSelectFile(event.target.files?.[0] || null);
                                                    event.currentTarget.value = "";
                                                }}
                                            />
                                            <input
                                                ref={videoInputRef}
                                                type="file"
                                                accept="video/*"
                                                className="hidden"
                                                onChange={(event) => {
                                                    handleSelectFile(event.target.files?.[0] || null);
                                                    event.currentTarget.value = "";
                                                }}
                                            />
                                        </div>
                                        <div className="flex min-h-10 flex-1 items-center gap-2 rounded-[1.75rem] bg-[#121214] px-4 py-2.5 ring-1 ring-white/8">
                                            <textarea
                                                value={composerText}
                                                onChange={(event) => handleComposerTextChange(event.target.value.slice(0, 1200))}
                                                onKeyDown={handleComposerKeyDown}
                                                rows={1}
                                                placeholder={selectedThread.viewerRole === "creator" ? "Reply..." : "Message"}
                                                className="block max-h-32 min-h-[22px] w-full resize-none self-center bg-transparent py-0.5 text-base leading-5 text-white placeholder:text-[#6e7077] focus:outline-none sm:text-[15px]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => void handleSendMessage()}
                                                disabled={sendingMessage}
                                                className={cn(
                                                    "inline-flex h-8 w-8 shrink-0 self-center items-center justify-center rounded-full transition",
                                                    sendingMessage
                                                        ? "bg-brand-purple/50 text-white/80"
                                                        : "bg-brand-purple text-white hover:bg-[#8457ff]",
                                                )}
                                                aria-label="Send message"
                                            >
                                                {sendingMessage ? (
                                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                ) : (
                                                    <Send className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex h-full min-h-0 flex-col items-center justify-center px-6 text-center">
                                <div className="rounded-full bg-[#141417] p-4 text-brand-purple ring-1 ring-white/8">
                                    <MessageSquare className="h-8 w-8" />
                                </div>
                                <h2 className="mt-5 text-2xl font-black text-white">Open a creator conversation</h2>
                                <p className="mt-2 max-w-md text-sm leading-6 text-[#8f9097]">
                                    Start from a creator page, follow them, then open Chat to keep the conversation in one place.
                                </p>
                                <div className="mt-6 flex flex-wrap justify-center gap-2">
                                    <Link href="/experiences" className="rounded-full bg-[#141417] px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/8">
                                        Browse creators
                                    </Link>
                                    <Link href="/dashboard/support" className="rounded-full bg-[#141417] px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/8">
                                        Support stays separate
                                    </Link>
                                </div>
                            </div>
                        )}
                        </section>
                    ) : null}
                </div>
            </div>
            {composePickerOpen ? (
                <div className="fixed inset-0 z-40 bg-black/70 px-4 py-6 backdrop-blur-[2px]">
                    <div ref={composePickerRef} className="mx-auto flex h-full w-full max-w-md flex-col justify-end">
                        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#111113] shadow-[0_32px_80px_rgba(0,0,0,0.55)]">
                            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                                <div>
                                    <p className="text-base font-semibold text-white">New message</p>
                                    <p className="mt-1 text-sm text-[#8f9097]">Choose a creator you already follow.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setComposePickerOpen(false)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-[#b6b6bc] transition hover:bg-white/10 hover:text-white"
                                    aria-label="Close new message picker"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto px-3 py-3">
                                {followedCreators.length > 0 ? followedCreators.map((creator) => (
                                    <button
                                        key={creator.uid}
                                        type="button"
                                        onClick={() => openThreadComposer(creator.uid)}
                                        className="flex w-full items-center gap-3 rounded-[1.2rem] px-3 py-3 text-left transition hover:bg-white/[0.04]"
                                    >
                                        <ChatAvatar
                                            photoURL={creator.photoURL}
                                            label={creator.displayName}
                                            sizeClassName="h-11 w-11"
                                            textClassName="text-sm"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-white">{creator.displayName}</p>
                                            <p className="truncate text-xs text-[#8f9097]">
                                                {creator.username ? `@${creator.username}` : creator.uid}
                                            </p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-[#63646b]" />
                                    </button>
                                )) : (
                                    <div className="px-3 py-10 text-center">
                                        <p className="text-base font-semibold text-white">No followed creators yet</p>
                                        <p className="mt-2 text-sm leading-6 text-[#8f9097]">
                                            Follow creators first, then come back here to start a new message.
                                        </p>
                                        <Link
                                            href="/experiences"
                                            className="mt-5 inline-flex rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e8e8ea]"
                                        >
                                            Follow creators
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

