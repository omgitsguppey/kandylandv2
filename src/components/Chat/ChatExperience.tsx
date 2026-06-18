"use client";

import Link from "next/link";
import { getSafeExternalUrl } from "@/lib/utils/url-sanitize";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createAutoHealingObserver, createCompactInteractionRecoveryGuard } from "@/lib/self-healing";
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
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { onDisconnect, onValue, ref, remove, set } from "firebase/database";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import { isStandalone } from "@/lib/browser-utils";
import { resolveChatAttachmentKind } from "@/lib/chat-attachments";
import { buildChatSoftSealScope, softOpenChatValue } from "@/lib/chat-soft-seal";
import {
    buildChatPaidGdGateState,
    buildChatPresenceMemberPath,
    CHAT_COLLECTIONS,
    isChatThreadVisibleToViewer,
    resolveChatThreadReadAt,
    resolveChatThreadUnreadCount,
    resolveChatViewerRole,
    type ChatInsufficientFundsPayload,
    type ChatMessageKind,
    type ChatPaidGdGateState,
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
import {
    buildCreatorProfileLinkTelemetryPayload,
    buildCreatorPublicHref,
    explainCreatorProfileRouteMissing,
} from "@/lib/creator-profile-routing";
import { reportClientIssue, reportRealtimeIssue, reportStorageIssue } from "@/lib/client-error-reporting";
import { storage, db, rtdb } from "@/lib/firebase-data";
import { formatCompactGd } from "@/lib/gumdrop-formatting";
import { fingerprintStoragePath, type MediaUploadLifecycleEventName, type MediaUploadStatus } from "@/lib/media/media-upload-contract";
import { buildMediaUploadTrackEventPayload } from "@/lib/media/media-upload-telemetry";
import { trackEvent } from "@/lib/telemetry";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { isAndroidStandalonePwa, isIosStandalonePwa } from "@/lib/device-layout-contract";
import { cn } from "@/lib/utils";
import { ref as storageRef, uploadBytes } from "firebase/storage";
import { CHAT_MEDIA_LIMIT_BYTES_DEFAULT, CHAT_MEDIA_LIMIT_BYTES_FAN_PASS } from "@/lib/chat/chat-media-limits";
import {
    CHAT_MESSAGE_LISTENER_LIMIT,
    CHAT_THREAD_LISTENER_LIMIT,
    type ChatRealtimeListenerScope,
    type ChatRealtimePropagationState,
} from "@/lib/chat/chat-realtime-contract";
import {
    CHAT_PRESENCE_CONTRACT,
    buildChatPresencePayload,
    buildChatPresenceTelemetryPayload,
    normalizeChatPresenceSnapshot,
    type ChatPresenceTelemetryEventName,
} from "@/lib/chat/chat-presence-contract";
import {
    createChatTypingControllerState,
    resolveChatTypingIntent,
    type ChatTypingIntentReason,
} from "@/lib/chat/chat-typing-controller";
import {
    buildChatRealtimeTelemetryPayload,
    type ChatRealtimeTelemetryEventName,
} from "@/lib/chat/chat-realtime-telemetry";
import {
    CHAT_LIST_CONTROL_HEIGHT,
    CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET,
    CHAT_LIST_CONTROLS_BOTTOM_OFFSET,
    CHAT_LIST_SCROLL_PADDING_BOTTOM,
    CHAT_THREAD_COMPOSER_PADDING_BOTTOM,
    USER_MOBILE_CHAT_BOTTOM_NAV_SAFE_OFFSET,
    USER_MOBILE_CHAT_BOTTOM_RESERVED_HEIGHT,
    USER_MOBILE_CHAT_CONTROL_BOTTOM_OFFSET,
    USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT,
    USER_MOBILE_CHAT_VIEWPORT_SHELL_HEIGHT,
} from "@/lib/user-mobile-shell";

const CHAT_COMPOSER_DEFAULT_HEIGHT_PX = 104;
const CHAT_COMPOSER_CLEAN_PADDING_PX = 72;
const CHAT_COMPOSER_SUMMARY_PADDING_PX = 92;
const CHAT_COMPOSER_STATUS_TRAY_MAX_HEIGHT_CLASSNAME = "max-h-[min(28vh,10rem)] overflow-y-auto overscroll-y-contain";
const CHAT_TRANSCRIPT_BOTTOM_GAP_PX = 14;
const CHAT_NEW_MESSAGE_MODAL_BOTTOM_OFFSET = `calc(${USER_MOBILE_CHAT_BOTTOM_NAV_SAFE_OFFSET} + 0.5rem)`;
const CHAT_NEW_MESSAGE_MODAL_IOS_BOTTOM_OFFSET = "calc(var(--kd-ios-pwa-bottom-nav-height, 56px) + var(--kd-ios-pwa-safe-bottom, env(safe-area-inset-bottom)) + 0.625rem)";
const CHAT_NEW_MESSAGE_MODAL_LIST_BOTTOM_PADDING = "calc(1rem + env(safe-area-inset-bottom))";
const CHAT_MEDIA_PREVIEW_STYLE = {
    maxWidth: "min(78vw, 28rem)",
    maxHeight: "32dvh",
} satisfies CSSProperties;

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
    followerCount?: number;
};

export const CHAT_VIEWPORT_SHELL_CLASSNAME =
    "mx-auto box-border flex h-full max-h-full min-h-0 w-full max-w-6xl flex-1 overflow-hidden px-3 sm:px-4";
export const CHAT_COMPACT_THREAD_LIST_PANEL_CLASSNAME =
    "flex h-full max-h-full min-h-0 flex-col overflow-hidden";
export const CHAT_COMPACT_THREAD_LIST_SCROLL_CLASSNAME =
    "min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5";

type CreatorRelationshipsListResponse = {
    followedCreators?: FollowedCreatorEntry[];
    recommendedCreators?: FollowedCreatorEntry[];
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
    uploadId?: string;
    correlationId?: string;
    storagePath: string;
    storagePathFingerprint?: string;
    fileName: string;
    mimeType: string;
    orphanDetectionAfterMs?: number;
    assetUrlPolicy?: string;
    errorCode?: string;
    maxBytes?: number;
    actualBytes?: number;
};

type ChatAttachmentCompleteResponse = {
    uploadId?: string;
    correlationId?: string;
    assetUrl: string;
    assetUrlPolicy?: string;
    assetName: string;
    assetMimeType: string;
    storagePath: string;
    storagePathFingerprint?: string;
    sizeBytes?: number;
    errorCode?: string;
    maxBytes?: number;
    actualBytes?: number;
};

type UploadedChatAttachment = {
    assetUrl: string;
    assetName: string;
    assetMimeType: string;
    storagePath: string;
};

type ChatTelemetryPayloadInput = {
    sourceComponent: string;
    userId?: string | null;
    thread?: ChatThreadRecord | null;
    threadId?: string | null;
    creatorId?: string | null;
    idempotencyKey?: string | null;
    messageId?: string | null;
    messageKind?: ChatMessageKind | null;
    hasAttachment?: boolean;
    errorCode?: string | null;
    errorMessage?: string | null;
};

type ChatClientDiagnosticCode =
    | "chat_threads_non_json"
    | "chat_threads_load_failed"
    | "followed_creators_non_json"
    | "followed_creators_load_failed"
    | "chat_thread_detail_non_json"
    | "chat_thread_detail_load_failed"
    | "chat_read_update_failed"
    | "chat_delete_failed"
    | "attachment_cleanup_non_json"
    | "attachment_cleanup_failed"
    | "unsupported_attachment_type"
    | "attachment_prepare_non_json"
    | "attachment_prepare_failed"
    | "storage_upload_failed"
    | "attachment_complete_non_json"
    | "attachment_complete_failed"
    | "chat_send_non_json"
    | "chat_send_failed";

class ChatClientSafeError extends Error {
    code: ChatClientDiagnosticCode;

    constructor(code: ChatClientDiagnosticCode, message: string) {
        super(message);
        this.name = "ChatClientSafeError";
        this.code = code;
    }
}

function buildChatSafeError(code: ChatClientDiagnosticCode, message: string) {
    return new ChatClientSafeError(code, message);
}

function readChatDiagnosticCode(error: unknown, fallback: ChatClientDiagnosticCode) {
    if (!error || typeof error !== "object") {
        return fallback;
    }
    const candidate = Reflect.get(error, "code");
    return typeof candidate === "string" ? candidate : fallback;
}

function buildChatMessageIdempotencyKey(threadId: string) {
    let random = globalThis.crypto?.randomUUID?.() ?? "";
    if (!random && globalThis.crypto?.getRandomValues) {
        const buffer = new Uint32Array(2);
        globalThis.crypto.getRandomValues(buffer);
        random = Array.from(buffer).map((value) => value.toString(36)).join("-");
    }
    if (!random) {
        random = `${Date.now()}`;
    }

    return `creator-private-chat:${threadId}:${random}`;
}

function buildChatAttachmentUploadCorrelationId(threadId: string) {
    return buildChatMessageIdempotencyKey(threadId).replace("creator-private-chat", "creator-private-chat-upload");
}

function readChatDisplayMode() {
    return isStandalone() ? "standalone" : "browser";
}

function readChatViewportSize() {
    if (typeof window === "undefined") {
        return {
            viewport_width: 0,
            viewport_height: 0,
        };
    }

    const viewport = window.visualViewport;
    return {
        viewport_width: Math.round(viewport?.width ?? window.innerWidth ?? 0),
        viewport_height: Math.round(viewport?.height ?? window.innerHeight ?? 0),
    };
}

function readMobileBottomNavTop() {
    if (typeof document === "undefined") {
        return null;
    }

    const bottomNav = document.querySelector('nav[aria-label="Mobile navigation"]');
    return bottomNav instanceof HTMLElement ? bottomNav.getBoundingClientRect().top : null;
}

type ChatDeferredTask = () => void;
type ChatDeferredCleanup = () => void;

function scheduleChatPostPaintTask(task: ChatDeferredTask): ChatDeferredCleanup {
    if (typeof window === "undefined") {
        return () => undefined;
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    const frameId = window.requestAnimationFrame(() => {
        timeoutId = window.setTimeout(() => {
            if (!cancelled) {
                task();
            }
        }, 0);
    });

    return () => {
        cancelled = true;
        window.cancelAnimationFrame(frameId);
        if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
        }
    };
}

function scheduleChatPostPaintDiagnostics(task: ChatDeferredTask): ChatDeferredCleanup {
    let cancelled = false;
    let idleId: number | null = null;
    const cancelPostPaint = scheduleChatPostPaintTask(() => {
        if (typeof window === "undefined") {
            return;
        }

        if (typeof window.requestIdleCallback === "function") {
            idleId = window.requestIdleCallback(() => {
                if (!cancelled) {
                    task();
                }
            }, { timeout: 900 });
            return;
        }

        if (!cancelled) {
            task();
        }
    });

    return () => {
        cancelled = true;
        cancelPostPaint();
        if (idleId !== null && typeof window !== "undefined" && typeof window.cancelIdleCallback === "function") {
            window.cancelIdleCallback(idleId);
        }
    };
}

function scheduleChatLayoutDiagnostics(task: ChatDeferredTask): ChatDeferredCleanup {
    if (typeof window === "undefined") {
        return () => undefined;
    }

    let cancelled = false;
    let frameId: number | null = null;
    const timeoutId = window.setTimeout(() => {
        frameId = window.requestAnimationFrame(() => {
            if (!cancelled) {
                task();
            }
        });
    }, 0);

    return () => {
        cancelled = true;
        window.clearTimeout(timeoutId);
        if (frameId !== null) {
            window.cancelAnimationFrame(frameId);
        }
    };
}

function deferChatDiagnosticReport(input: Parameters<typeof reportClientIssue>[0]) {
    scheduleChatPostPaintDiagnostics(() => reportClientIssue(input));
}

function deferChatRealtimeIssue(scope: string, error?: unknown, detail?: Record<string, unknown>) {
    scheduleChatPostPaintDiagnostics(() => reportRealtimeIssue(scope, error, detail));
}

function buildChatTelemetryPayload({
    sourceComponent,
    userId,
    thread,
    threadId,
    creatorId,
    idempotencyKey,
    messageId,
    messageKind,
    hasAttachment,
    errorCode,
    errorMessage,
}: ChatTelemetryPayloadInput) {
    const resolvedThreadId = thread?.id ?? threadId ?? null;
    const resolvedCreatorId = thread?.creatorId ?? creatorId ?? null;

    return {
        source_component: sourceComponent,
        route: "/dashboard/chat",
        display_mode: readChatDisplayMode(),
        ...readChatViewportSize(),
        ...(userId ? { user_id: userId } : {}),
        ...(resolvedThreadId ? { thread_id: resolvedThreadId } : {}),
        ...(resolvedCreatorId ? { creator_id: resolvedCreatorId, target_creator_id: resolvedCreatorId } : {}),
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
        ...(messageId ? { message_id: messageId } : {}),
        ...(messageKind ? { message_kind: messageKind } : {}),
        ...(typeof hasAttachment === "boolean" ? { has_attachment: hasAttachment } : {}),
        ...(errorCode ? { error_code: errorCode } : {}),
        ...(errorMessage ? { error_message: errorMessage.slice(0, 160) } : {}),
    };
}

function buildChatMediaUploadPayload(input: {
    eventName: MediaUploadLifecycleEventName;
    uploadId: string;
    correlationId?: string | null;
    userId?: string | null;
    threadId?: string | null;
    mediaKind: "image" | "video";
    mimeType: string;
    sizeBytes: number;
    maxBytes: number;
    storagePath?: string | null;
    status: MediaUploadStatus;
    failureReason?: string | null;
    durationMs?: number | null;
    retryCount?: number | null;
}) {
    return {
        ...buildMediaUploadTrackEventPayload({
            eventName: input.eventName,
            uploadId: input.uploadId,
            correlationId: input.correlationId ?? input.uploadId,
            ownerUserId: input.userId ?? null,
            featureId: "support",
            surface: "chat",
            mediaKind: input.mediaKind,
            mimeType: input.mimeType || "application/octet-stream",
            sizeBytes: input.sizeBytes,
            maxBytes: input.maxBytes,
            storagePath: input.storagePath,
            status: input.status,
            failureReason: input.failureReason,
            durationMs: input.durationMs,
            retryCount: input.retryCount,
            privacyClass: "required_integrity",
        }),
        source_component: "chat_thread_composer",
        route: "/dashboard/chat",
        ...(input.threadId ? { thread_id: input.threadId } : {}),
    };
}

function deferChatThreadOpenedTelemetry(input: ChatTelemetryPayloadInput) {
    scheduleChatPostPaintTask(() => {
        trackEvent("chat_thread_opened", buildChatTelemetryPayload(input));
    });
}

function deferChatComposeSheetOpenedTelemetry(input: ChatTelemetryPayloadInput) {
    scheduleChatPostPaintTask(() => {
        trackEvent("chat_compose_sheet_opened", buildChatTelemetryPayload(input));
    });
}

function deferChatListSearchFocusedTelemetry(input: ChatTelemetryPayloadInput) {
    scheduleChatPostPaintTask(() => {
        trackEvent("chat_list_search_focused", buildChatTelemetryPayload(input));
    });
}

function deferChatMessageSendAttemptedTelemetry(input: ChatTelemetryPayloadInput) {
    scheduleChatPostPaintTask(() => {
        trackEvent("chat_message_send_attempted", buildChatTelemetryPayload(input));
    });
}

function deferChatMessageSendFailedTelemetry(input: ChatTelemetryPayloadInput) {
    scheduleChatPostPaintTask(() => {
        const payload = buildChatTelemetryPayload(input);
        trackEvent("chat_message_send_failed", payload);
        trackEvent("chat_message_failed", payload);
    });
}

function deferChatMessageSentTelemetry(input: ChatTelemetryPayloadInput) {
    scheduleChatPostPaintTask(() => {
        trackEvent("chat_message_sent", buildChatTelemetryPayload(input));
    });
}

function deferChatRealtimeTelemetry(input: {
    eventName: ChatRealtimeTelemetryEventName;
    userId?: string | null;
    threadId?: string | null;
    messageId?: string | null;
    listenerScope?: ChatRealtimeListenerScope | null;
    propagationState?: ChatRealtimePropagationState | null;
    sourceComponent?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    documentLimit?: number | null;
}) {
    scheduleChatPostPaintTask(() => {
        trackEvent(input.eventName, buildChatRealtimeTelemetryPayload(input));
    });
}

function deferChatPresenceTelemetry(input: {
    eventName: ChatPresenceTelemetryEventName;
    userId?: string | null;
    threadId?: string | null;
    typing?: boolean | null;
    reason?: string | null;
    errorMessage?: string | null;
}) {
    scheduleChatPostPaintTask(() => {
        trackEvent(input.eventName, buildChatPresenceTelemetryPayload(input));
    });
}

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

function readCreatorFirstName(label?: string | null) {
    const trimmed = (label || "").trim();
    if (!trimmed) {
        return "this creator";
    }

    const [firstName] = trimmed.split(/\s+/).filter(Boolean);
    return firstName || trimmed;
}

function resolveChatPaidGdPurchaseTarget(gate: ChatPaidGdGateState | null, fallbackShortfall?: number | null) {
    const preferredAmount = gate?.requiredMinPaidGd ?? fallbackShortfall ?? 0;
    return Math.max(100, preferredAmount || 100);
}

function isImageAttachment(mimeType?: string, assetUrl?: string) {
    return Boolean(mimeType?.startsWith("image/") || assetUrl?.match(/\.(png|jpg|jpeg|gif|webp)$/i));
}

function isVideoAttachment(mimeType?: string, assetUrl?: string) {
    return Boolean(mimeType?.startsWith("video/") || assetUrl?.match(/\.(mp4|webm|mov)$/i));
}

function buildChatIceBreakers(creatorFirstName: string) {
    return [
        `Hey ${creatorFirstName} 👋`,
        "What drop should I unwrap first?",
        "What are you posting next?",
        "I just found your page 🍬",
        "Send me your favorite drop",
    ];
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

function ChatPaidGdGuidanceCard({
    creatorFirstName,
    gate,
    payload,
    onClose,
    onPurchase,
    onBrowseDrops,
    mode,
}: {
    creatorFirstName: string;
    gate: ChatPaidGdGateState | null;
    payload: ChatInsufficientFundsPayload | null;
    onClose?: () => void;
    onPurchase: () => void;
    onBrowseDrops: () => void;
    mode: "proactive" | "reactive";
}) {
    const activeGate = gate ?? (payload ? {
        requiredMinPaidGd: payload.requiredPriceGd,
        purchasedBalanceGd: payload.purchasedBalanceGd,
        paidGdShortfall: payload.paidGdShortfall,
        subscriberFreeChatApplies: payload.subscriberFreeChatApplies,
        creatorViewerBypass: false,
        gated: true,
    } satisfies ChatPaidGdGateState : null);

    if (!activeGate) {
        return null;
    }

    return (
        <div className="rounded-[1.35rem] border border-brand-purple/25 bg-[linear-gradient(135deg,rgba(122,75,255,0.22),rgba(28,20,45,0.94))] px-4 py-3 text-sm text-white shadow-[0_16px_40px_rgba(56,23,112,0.28)] ring-1 ring-white/8">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-5 text-white">
                        To message {creatorFirstName}, you&apos;ll need to get more paid GumDrops!
                    </p>
                    <div className="mt-2 space-y-1.5 text-[12px] leading-4 text-[#e5ddff]">
                        <div className="flex items-start gap-2">
                            <Circle className="mt-0.5 h-2.5 w-2.5 fill-current text-brand-purple" />
                            <span>Free GumDrops are only for unwrapping KandyDrops.</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <Circle className="mt-0.5 h-2.5 w-2.5 fill-current text-brand-purple" />
                            <span>Paid GumDrops allow you to send a text, pic, or vid straight to your favorite creator!</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <Circle className="mt-0.5 h-2.5 w-2.5 fill-current text-brand-purple" />
                            <span>Every message helps support {creatorFirstName}, no chat agencies, ever.</span>
                        </div>
                    </div>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[#cdbdff]">
                        Paid GD {formatCompactGd(activeGate.purchasedBalanceGd)} / Need {formatCompactGd(activeGate.requiredMinPaidGd)}
                    </p>
                </div>
                {mode === "reactive" && onClose ? (
                    <button type="button" onClick={onClose} className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#cdbdff]">
                        Close
                    </button>
                ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="brand" size="sm" onClick={onPurchase}>
                    Get More GumDrops
                </Button>
                <Button variant="ghost" size="sm" onClick={onBrowseDrops} className="border border-white/12 bg-white/6 text-white hover:bg-white/10">
                    Go unwrap drops
                </Button>
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
    const [recommendedCreators, setRecommendedCreators] = useState<FollowedCreatorEntry[]>([]);
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
    const typingControllerStateRef = useRef(createChatTypingControllerState());
    const messageListRef = useRef<HTMLDivElement | null>(null);
    const shouldStickToBottomRef = useRef(true);
    const initialBottomAnchoredThreadRef = useRef<string | null>(null);
    const chatViewportShellRef = useRef<HTMLDivElement | null>(null);
    const compactThreadListPanelRef = useRef<HTMLElement | null>(null);
    const compactThreadListScrollRef = useRef<HTMLDivElement | null>(null);
    const compactThreadListControlsRef = useRef<HTMLDivElement | null>(null);
    const compactThreadListFloatingActionRef = useRef<HTMLButtonElement | null>(null);
    const chatThreadComposerRef = useRef<HTMLDivElement | null>(null);
    const chatThreadComposerControlRef = useRef<HTMLDivElement | null>(null);
    const compactThreadListLayoutReportKeyRef = useRef<string | null>(null);
    const chatThreadComposerLayoutReportKeyRef = useRef<string | null>(null);
    const attachmentMenuRef = useRef<HTMLDivElement | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const videoInputRef = useRef<HTMLInputElement | null>(null);
    const composePickerRef = useRef<HTMLDivElement | null>(null);
    const threadEditMenuRef = useRef<HTMLDivElement | null>(null);
    const threadSearchInputRef = useRef<HTMLInputElement | null>(null);
    const selectedThreadIdRef = useRef<string | null>(selectedThreadId);
    const selectedDetailThreadRef = useRef<ChatThreadRecord | null>(selectedDetail?.thread ?? null);
    const threadDetailRequestIdRef = useRef(0);
    const threadsLoadRequestIdRef = useRef(0);
    const [chatComposerHeightPx, setChatComposerHeightPx] = useState(CHAT_COMPOSER_DEFAULT_HEIGHT_PX);
    const profileRouteTelemetryKeyRef = useRef<string | null>(null);
    const noFollowPromptViewedRef = useRef(false);
    const emptyStateViewedKeyRef = useRef<string | null>(null);
    const paidGdGateViewedKeyRef = useRef<string | null>(null);
    const autoResolvedThreadKeyRef = useRef<string | null>(null);
    const chatSurfaceViewedKeyRef = useRef<string | null>(null);

    const visibleThreads = useMemo(
        () => mergeThreads(threads, selectedDetail?.thread ?? null),
        [selectedDetail?.thread, threads],
    );
    const visibleThreadById = useMemo(() => {
        const map = new Map<string, ChatThreadRecord>();
        visibleThreads.forEach((thread) => {
            map.set(thread.id, thread);
        });
        return map;
    }, [visibleThreads]);
    const visibleThreadIdSet = useMemo(() => new Set(visibleThreadById.keys()), [visibleThreadById]);

    const selectedThread = useMemo(
        () => (selectedThreadId ? visibleThreadById.get(selectedThreadId) ?? selectedDetail?.thread ?? null : selectedDetail?.thread ?? null),
        [selectedDetail?.thread, selectedThreadId, visibleThreadById],
    );
    const selectedThreadCreatorRouteInput = useMemo(() => {
        if (!selectedThread || selectedThread.viewerRole === "creator") {
            return null;
        }

        return {
            uid: selectedThread.creatorId,
            creatorId: selectedThread.creatorId,
            username: selectedThread.counterpartUsername,
            creatorUsername: selectedThread.counterpartUsername,
        };
    }, [selectedThread]);
    const selectedThreadCreatorProfileHref = useMemo(() => {
        return buildCreatorPublicHref(selectedThreadCreatorRouteInput);
    }, [selectedThreadCreatorRouteInput]);
    const selectedThreadCreatorProfileMissingReason = useMemo(() => {
        return selectedThreadCreatorRouteInput && !selectedThreadCreatorProfileHref
            ? explainCreatorProfileRouteMissing(selectedThreadCreatorRouteInput)
            : "";
    }, [selectedThreadCreatorProfileHref, selectedThreadCreatorRouteInput]);
    const chatProfileLinkActor = useMemo(() => ({
        uid: user?.uid ?? "",
        email: user?.email ?? "",
        role: userProfile?.role ?? (user ? "user" : "guest"),
    }), [user, userProfile?.role]);
    const deferredThreadSearch = useDeferredValue(threadSearch);
    const normalizedThreadSearch = useMemo(() => deferredThreadSearch.trim().toLowerCase(), [deferredThreadSearch]);
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
    const [isAndroidPwaChatShell, setIsAndroidPwaChatShell] = useState(false);
    const [isIosPwaChatShell, setIsIosPwaChatShell] = useState(false);
    const canComposeFromFollowedCreators = followedCreators.length > 0;
    const selectedThreadCreatorFirstName = selectedThread ? readCreatorFirstName(selectedThread.counterpartDisplayName) : "this creator";

    useEffect(() => {
        const key = user?.uid ?? "guest";
        if (chatSurfaceViewedKeyRef.current === key) {
            return;
        }
        chatSurfaceViewedKeyRef.current = key;
        trackEvent("chat_surface_viewed", {
            source_component: "chat_surface",
            route: "/dashboard/chat",
            display_mode: readChatDisplayMode(),
            platform_shell: isIosPwaChatShell ? "ios-pwa" : "default",
            user_id: user?.uid ?? undefined,
            ...readChatViewportSize(),
        });
    }, [isIosPwaChatShell, user?.uid]);
    const proactivePaidGdGate = useMemo(() => buildChatPaidGdGateState({
        viewerRole: selectedThread?.viewerRole ?? "user",
        pricing: selectedDetail?.pricing,
    }), [selectedDetail?.pricing, selectedThread?.viewerRole]);
    const proactivePaidGdGateVisible = proactivePaidGdGate?.gated === true;
    const chatFanPassActive = selectedDetail?.pricing?.fanPassActive === true;
    const composerBlockedByPaidGdGate = proactivePaidGdGateVisible;
    const composerSummary = useMemo(
        () => renderPriceSummary(selectedDetail, selectedThread?.viewerRole ?? "user"),
        [selectedDetail, selectedThread?.viewerRole],
    );
    const hasFullComposerTray = Boolean(sendErrorMessage || sendWarningMessage || insufficientFunds || proactivePaidGdGateVisible || composerFile);
    const hasSummaryOnlyComposerTray = Boolean(composerSummary) && !hasFullComposerTray;
    const composerPaddingMode = hasFullComposerTray ? "tray" : hasSummaryOnlyComposerTray ? "summary" : "clean";
    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const syncPlatformPwaShell = () => {
            setIsAndroidPwaChatShell(isAndroidStandalonePwa());
            setIsIosPwaChatShell(isIosStandalonePwa());
        };

        syncPlatformPwaShell();
        window.addEventListener("resize", syncPlatformPwaShell, { passive: true });
        window.addEventListener("orientationchange", syncPlatformPwaShell, { passive: true });

        return () => {
            window.removeEventListener("resize", syncPlatformPwaShell);
            window.removeEventListener("orientationchange", syncPlatformPwaShell);
        };
    }, []);

    useEffect(() => {
        if (!isIosPwaChatShell) {
            return;
        }

        trackEvent("chat_ios_pwa_shell_applied", {
            source_component: "chat_shell",
            route: "/dashboard/chat",
            platform_shell: "ios-pwa",
        });
    }, [isIosPwaChatShell]);

    const chatViewportShellStyle = useMemo(() => ({
        paddingBottom: isCompactViewport
            ? (isAndroidPwaChatShell ? "var(--kd-android-pwa-bottom-nav-height, var(--user-mobile-chat-bottom-reserved-height, 0px))" : USER_MOBILE_CHAT_BOTTOM_NAV_SAFE_OFFSET)
            : undefined,
        minHeight: isCompactViewport ? USER_MOBILE_CHAT_VIEWPORT_SHELL_HEIGHT : undefined,
        height: isCompactViewport ? USER_MOBILE_CHAT_VIEWPORT_SHELL_HEIGHT : undefined,
        maxHeight: isCompactViewport ? USER_MOBILE_CHAT_VIEWPORT_SHELL_HEIGHT : undefined,
        transform: isIosPwaChatShell ? "translateY(calc(-1 * var(--kd-ios-pwa-shell-lift, 0px)))" : undefined,
    }) satisfies CSSProperties, [isAndroidPwaChatShell, isCompactViewport, isIosPwaChatShell]);
    const compactThreadListScrollStyle = useMemo(() => ({
        paddingBottom: CHAT_LIST_SCROLL_PADDING_BOTTOM,
        scrollPaddingBottom: CHAT_LIST_SCROLL_PADDING_BOTTOM,
    }) satisfies CSSProperties, []);
    const compactThreadListControlsStyle = useMemo(() => ({
        bottom: CHAT_LIST_CONTROLS_BOTTOM_OFFSET,
    }) satisfies CSSProperties, []);
    const compactThreadListFloatingActionStyle = useMemo(() => ({
        bottom: CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET,
    }) satisfies CSSProperties, []);
    const chatThreadComposerStyle = useMemo(() => ({
        paddingBottom: isCompactViewport ? CHAT_THREAD_COMPOSER_PADDING_BOTTOM : undefined,
    }) satisfies CSSProperties, [isCompactViewport]);
    const chatThreadSectionStyle = useMemo(() => ({
        ["--chat-composer-height" as "--chat-composer-height"]: `${chatComposerHeightPx}px`,
        ["--chat-safe-bottom" as "--chat-safe-bottom"]: isCompactViewport ? USER_MOBILE_CHAT_BOTTOM_NAV_SAFE_OFFSET : "0px",
        ["--chat-transcript-bottom-padding" as "--chat-transcript-bottom-padding"]: composerPaddingMode === "tray"
            ? `calc(${chatComposerHeightPx}px + var(--chat-safe-bottom, 0px))`
            : composerPaddingMode === "summary"
                ? `calc(${CHAT_COMPOSER_SUMMARY_PADDING_PX}px + var(--chat-safe-bottom, 0px))`
                : `calc(${CHAT_COMPOSER_CLEAN_PADDING_PX}px + var(--chat-safe-bottom, 0px))`,
    }) as CSSProperties, [chatComposerHeightPx, composerPaddingMode, isCompactViewport]);
    const chatTranscriptStyle = useMemo(() => ({
        paddingBottom: CHAT_TRANSCRIPT_BOTTOM_GAP_PX,
        scrollPaddingBottom: CHAT_TRANSCRIPT_BOTTOM_GAP_PX,
    }) satisfies CSSProperties, []);
    const newMessageSheetStyle = useMemo(() => (
        isIosPwaChatShell
            ? {
                paddingBottom: CHAT_NEW_MESSAGE_MODAL_IOS_BOTTOM_OFFSET,
            } satisfies CSSProperties
            : {
                paddingBottom: CHAT_NEW_MESSAGE_MODAL_BOTTOM_OFFSET,
            } satisfies CSSProperties
    ), [isIosPwaChatShell]);
    const newMessageListStyle = useMemo(() => ({
        paddingBottom: CHAT_NEW_MESSAGE_MODAL_LIST_BOTTOM_PADDING,
        scrollPaddingBottom: CHAT_NEW_MESSAGE_MODAL_LIST_BOTTOM_PADDING,
    }) satisfies CSSProperties, []);
    const selectedThreadIdSet = useMemo(() => new Set(selectedThreadIds), [selectedThreadIds]);
    const liveViewerRole = useMemo(() => resolveChatViewerRole({
        viewerUid: user?.uid || "",
        creatorId,
        profile: userProfile,
    }), [creatorId, user?.uid, userProfile]);

    const releaseThreadSearchFocus = useCallback(() => {
        if (typeof document === "undefined") {
            return;
        }

        const activeElement = document.activeElement;
        const searchInput = threadSearchInputRef.current;

        if (!searchInput) {
            return;
        }

        if (activeElement === searchInput) {
            searchInput.blur();
        }
    }, []);

    const scheduleCompactInteractionRecovery = useCallback((scope: string, target?: HTMLElement | null) => {
        const recoveryGuard = createCompactInteractionRecoveryGuard({
            isEnabled: () => isCompactViewport,
            getTarget: () => target ?? threadSearchInputRef.current,
            isOverlayOpen: () => composePickerOpen,
            isDocumentScrollLockExpected: () => true,
            onRecovered: (snapshot) => {
                deferChatDiagnosticReport({
                    channel: "ui",
                    severity: "warn",
                    message: "Compact chat interaction required recovery",
                    detail: {
                        scope,
                        ...snapshot,
                    },
                    consoleLabel: "[Chat] compact interaction recovered",
                });
            },
        });
        recoveryGuard.scheduleCheck();
        return recoveryGuard;
    }, [composePickerOpen, isCompactViewport]);

    useEffect(() => {
        selectedThreadIdRef.current = selectedThreadId;
    }, [selectedThreadId]);


    useEffect(() => {
        selectedDetailThreadRef.current = selectedDetail?.thread ?? null;
    }, [selectedDetail?.thread]);

    useEffect(() => {
        if (!isCompactViewport || !selectedThreadId) {
            return;
        }

        const cancelFocusRelease = scheduleChatPostPaintTask(releaseThreadSearchFocus);
        const recoveryGuard = scheduleCompactInteractionRecovery("chat_thread_transition");
        return () => {
            cancelFocusRelease();
            recoveryGuard.cleanup();
        };
    }, [isCompactViewport, releaseThreadSearchFocus, scheduleCompactInteractionRecovery, selectedThreadId]);

    useEffect(() => () => {
        scheduleChatPostPaintTask(() => {
            releaseThreadSearchFocus();
            const recoveryGuard = createCompactInteractionRecoveryGuard({
                isEnabled: () => isCompactViewport,
                getTarget: () => threadSearchInputRef.current,
                isOverlayOpen: () => composePickerOpen,
                isDocumentScrollLockExpected: () => true,
                onRecovered: (snapshot) => {
                    deferChatDiagnosticReport({
                        channel: "ui",
                        severity: "warn",
                        message: "Compact chat interaction required recovery",
                        detail: {
                            scope: "chat_unmount_cleanup",
                            ...snapshot,
                        },
                        consoleLabel: "[Chat] compact interaction recovered",
                    });
                },
            });
            recoveryGuard.scheduleCheck();
        });
    }, [composePickerOpen, isCompactViewport, releaseThreadSearchFocus]);

    useEffect(() => {
        if (!showCompactThreadListOnly || typeof window === "undefined" || typeof document === "undefined") {
            compactThreadListLayoutReportKeyRef.current = null;
            return;
        }

        const cancelDiagnostics = scheduleChatLayoutDiagnostics(() => {
            const shell = chatViewportShellRef.current;
            const panel = compactThreadListPanelRef.current;
            const scrollArea = compactThreadListScrollRef.current;
            const controls = compactThreadListControlsRef.current;
            const floatingAction = compactThreadListFloatingActionRef.current;
            if (!shell || !panel || !scrollArea) {
                return;
            }

            const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
            const bottomNavTop = readMobileBottomNavTop() ?? viewportHeight;
            const shellRect = shell.getBoundingClientRect();
            const panelRect = panel.getBoundingClientRect();
            const controlsRect = controls?.getBoundingClientRect() ?? null;
            const floatingActionRect = floatingAction?.getBoundingClientRect() ?? null;
            const main = document.querySelector("main");
            const mainElement = main instanceof HTMLElement ? main : null;
            const mainRect = mainElement?.getBoundingClientRect() ?? null;
            const mainStyle = mainElement ? window.getComputedStyle(mainElement) : null;
            const scrollStyle = window.getComputedStyle(scrollArea);
            const expectedShellTopPx = mainRect && mainStyle
                ? mainRect.top + (Number.parseFloat(mainStyle.paddingTop) || 0)
                : shellRect.top;
            const shellTopDriftPx = Math.max(0, Math.round(shellRect.top - expectedShellTopPx));
            const shellShiftedBelowNavbar = shellTopDriftPx > 8;
            const documentScrollLeak = Math.max(
                document.documentElement.scrollHeight,
                document.body.scrollHeight,
            ) > viewportHeight + 2;
            const shellBottomOverflowPx = Math.max(0, Math.round(shellRect.bottom - viewportHeight));
            const panelBottomOverflowPx = Math.max(0, Math.round(panelRect.bottom - viewportHeight));
            const scrollAreaTooShort = scrollArea.clientHeight < 160 && filteredThreads.length > 0;
            const scrollAreaOwnsOverflow = scrollStyle.overflowY === "auto" || scrollStyle.overflowY === "scroll";
            const controlsGapPx = controlsRect ? Math.round(bottomNavTop - controlsRect.bottom) : null;
            const floatingActionGapPx = floatingActionRect ? Math.round(bottomNavTop - floatingActionRect.bottom) : null;
            const controlsTooCloseToBottomNav = (controlsGapPx !== null && controlsGapPx < 12)
                || (floatingActionGapPx !== null && floatingActionGapPx < 12);

            if (
                shellBottomOverflowPx === 0
                && panelBottomOverflowPx === 0
                && !documentScrollLeak
                && !scrollAreaTooShort
                && scrollAreaOwnsOverflow
                && !controlsTooCloseToBottomNav
                && !shellShiftedBelowNavbar
            ) {
                compactThreadListLayoutReportKeyRef.current = null;
                return;
            }

            const reportKey = [
                shellBottomOverflowPx,
                panelBottomOverflowPx,
                documentScrollLeak ? "document-scroll" : "document-locked",
                scrollAreaTooShort ? "short-scroll-area" : "scroll-area-ok",
                scrollAreaOwnsOverflow ? "own-scroll" : "missing-scroll-owner",
                shellShiftedBelowNavbar ? `shell-top-drift-${shellTopDriftPx}` : "shell-top-ok",
                controlsGapPx ?? "controls-missing",
                floatingActionGapPx ?? "floating-action-missing",
            ].join(":");

            if (compactThreadListLayoutReportKeyRef.current === reportKey) {
                return;
            }
            compactThreadListLayoutReportKeyRef.current = reportKey;

            const warningMessage = !scrollAreaOwnsOverflow
                ? "Chat list scroll container lost viewport ownership."
                : shellShiftedBelowNavbar
                    ? "Chat input focus shifted the shell below the navbar."
                : controlsTooCloseToBottomNav
                    ? "Chat controls are too close to the bottom navigation."
                    : "Compact chat list layout violated viewport bounds";

            deferChatDiagnosticReport({
                channel: "ui",
                severity: "warn",
                message: warningMessage,
                detail: {
                    scope: "chat_compact_thread_list",
                    viewportHeight,
                    bottomNavTop: Math.round(bottomNavTop),
                    shellHeight: Math.round(shellRect.height),
                    shellTop: Math.round(shellRect.top),
                    expectedShellTopPx: Math.round(expectedShellTopPx),
                    shellTopDriftPx,
                    shellBottomOverflowPx,
                    panelHeight: Math.round(panelRect.height),
                    panelBottomOverflowPx,
                    controlsGapPx,
                    floatingActionGapPx,
                    controlsExpectedHeight: CHAT_LIST_CONTROL_HEIGHT,
                    scrollClientHeight: scrollArea.clientHeight,
                    scrollHeight: scrollArea.scrollHeight,
                    scrollOverflowY: scrollStyle.overflowY,
                    documentScrollLeak,
                    mainHeight: mainElement?.style.height || null,
                    mainOverflow: mainElement?.style.overflow || null,
                },
                consoleLabel: "[Chat] compact thread list layout warning",
            });
        });

        return cancelDiagnostics;
    }, [filteredThreads.length, showCompactThreadListOnly, threadSelectionMode, threadsLoading]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const composer = chatThreadComposerRef.current;
        if (!composer) {
            setChatComposerHeightPx(CHAT_COMPOSER_DEFAULT_HEIGHT_PX);
            return;
        }

        const syncComposerHeight = () => {
            const nextHeight = Math.max(CHAT_COMPOSER_DEFAULT_HEIGHT_PX, Math.ceil(composer.getBoundingClientRect().height));
            setChatComposerHeightPx((current) => (Math.abs(current - nextHeight) > 1 ? nextHeight : current));
        };

        syncComposerHeight();

        if (typeof window.ResizeObserver === "function") {
            const resizeObserver = new window.ResizeObserver(() => syncComposerHeight());
            resizeObserver.observe(composer);
            return () => resizeObserver.disconnect();
        }

        window.addEventListener("resize", syncComposerHeight);
        return () => {
            window.removeEventListener("resize", syncComposerHeight);
        };
    }, [composerFile, insufficientFunds, isCompactViewport, selectedThreadId, sendErrorMessage, sendWarningMessage]);

    useEffect(() => {
        if (
            !isCompactViewport
            || showCompactThreadListOnly
            || typeof window === "undefined"
            || typeof document === "undefined"
        ) {
            chatThreadComposerLayoutReportKeyRef.current = null;
            return;
        }

        const cancelDiagnostics = scheduleChatLayoutDiagnostics(() => {
            const shell = chatViewportShellRef.current;
            const composer = chatThreadComposerRef.current;
            const composerControl = chatThreadComposerControlRef.current;
            if (!composer || !composerControl) {
                return;
            }

            const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
            const bottomNavTop = readMobileBottomNavTop() ?? viewportHeight;
            const composerRect = composer.getBoundingClientRect();
            const composerControlRect = composerControl.getBoundingClientRect();
            const shellRect = shell?.getBoundingClientRect() ?? null;
            const main = document.querySelector("main");
            const mainElement = main instanceof HTMLElement ? main : null;
            const mainRect = mainElement?.getBoundingClientRect() ?? null;
            const mainStyle = mainElement ? window.getComputedStyle(mainElement) : null;
            const expectedShellTopPx = shellRect && mainRect && mainStyle
                ? mainRect.top + (Number.parseFloat(mainStyle.paddingTop) || 0)
                : shellRect?.top ?? null;
            const shellTopDriftPx = shellRect && expectedShellTopPx !== null
                ? Math.max(0, Math.round(shellRect.top - expectedShellTopPx))
                : 0;
            const shellShiftedBelowNavbar = shellTopDriftPx > 8;
            const composerControlGapPx = Math.round(bottomNavTop - composerControlRect.bottom);
            const composerBottomOverflowPx = Math.max(0, Math.round(composerRect.bottom - viewportHeight));

            if (composerControlGapPx >= 12 && composerBottomOverflowPx === 0 && !shellShiftedBelowNavbar) {
                chatThreadComposerLayoutReportKeyRef.current = null;
                return;
            }

            const reportKey = [
                composerControlGapPx,
                composerBottomOverflowPx,
                Math.round(composerRect.height),
                shellShiftedBelowNavbar ? `shell-top-drift-${shellTopDriftPx}` : "shell-top-ok",
            ].join(":");

            if (chatThreadComposerLayoutReportKeyRef.current === reportKey) {
                return;
            }
            chatThreadComposerLayoutReportKeyRef.current = reportKey;

            deferChatDiagnosticReport({
                channel: "ui",
                severity: "warn",
                message: shellShiftedBelowNavbar
                    ? "Chat input focus shifted the shell below the navbar."
                    : "Chat composer exceeded reserved bottom space.",
                detail: {
                    scope: "chat_thread_composer",
                    viewportHeight,
                    bottomNavTop: Math.round(bottomNavTop),
                    shellTop: shellRect ? Math.round(shellRect.top) : null,
                    expectedShellTopPx: expectedShellTopPx === null ? null : Math.round(expectedShellTopPx),
                    shellTopDriftPx,
                    composerHeight: Math.round(composerRect.height),
                    composerBottomOverflowPx,
                    composerControlGapPx,
                    composerPaddingBottom: CHAT_THREAD_COMPOSER_PADDING_BOTTOM,
                },
                consoleLabel: "[Chat] compact composer navigation clearance warning",
            });
        });

        return cancelDiagnostics;
    }, [
        composerFile,
        insufficientFunds,
        isCompactViewport,
        selectedThreadId,
        sendErrorMessage,
        sendWarningMessage,
        showCompactThreadListOnly,
    ]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const missingProfileHrefReason = selectedThreadCreatorProfileMissingReason || null;

        (window as typeof window & {
            __KANDYDROPS_CHAT_SHELL_ROUTING_DEBUG__?: unknown;
        }).__KANDYDROPS_CHAT_SHELL_ROUTING_DEBUG__ = {
            chatShellMode: showCompactThreadListOnly ? "list" : "thread",
            chatBottomNavReserved: true,
            chatComposerAboveBottomNav: true,
            chatListControlsAboveBottomNav: true,
            chatDensity: "public-beta-compact",
            chatInteractionPerformance: "optimized",
            chatDiagnosticsDeferred: true,
            chatTapPath: "nonblocking",
            chatViewportOwner: "internal",
            chatInputFocusStable: true,
            chatComposerChin: "compact",
            chatTopOffset: "navbar-aligned",
            displayMode: readChatDisplayMode(),
            messagesListUsesChatShellSizing: true,
            messagesListUsesSharedBottomNavContract: true,
            chatThreadUsesSharedBottomNavContract: true,
            bottomNavReservedHeight: USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT,
            chatBottomReservedHeight: USER_MOBILE_CHAT_BOTTOM_RESERVED_HEIGHT,
            chatBottomNavSafeOffset: USER_MOBILE_CHAT_BOTTOM_NAV_SAFE_OFFSET,
            chatShellReservesBottomNav: true,
            chatControlBottomOffset: USER_MOBILE_CHAT_CONTROL_BOTTOM_OFFSET,
            chatInnerControlBottomOffset: CHAT_LIST_CONTROLS_BOTTOM_OFFSET,
            safeAreaBottomAppliedAt: "user-mobile-shell",
            safeAreaBottomApplied: true,
            duplicateSafeAreaBottomDetected: false,
            messagesListScrollContainerFound: Boolean(compactThreadListScrollRef.current),
            messagesListFloatingActionVisible: showCompactThreadListOnly ? canComposeFromFollowedCreators : true,
            messagesSearchVisible: showCompactThreadListOnly,
            newThreadControlVisible: showCompactThreadListOnly ? canComposeFromFollowedCreators : true,
            newThreadControlAboveBottomNav: true,
            composerAboveBottomNav: true,
            chatThreadProfileHref: selectedThreadCreatorProfileHref,
            chatThreadProfileHrefValid: Boolean(selectedThreadCreatorProfileHref),
            missingProfileHrefReason,
        };

        if (selectedThreadCreatorRouteInput && missingProfileHrefReason) {
            const telemetryKey = `${selectedThread?.id ?? "thread"}:${missingProfileHrefReason}`;
            if (profileRouteTelemetryKeyRef.current !== telemetryKey) {
                profileRouteTelemetryKeyRef.current = telemetryKey;
                trackEvent("creator_profile_link_missing", buildCreatorProfileLinkTelemetryPayload({
                    actor: chatProfileLinkActor,
                    creator: selectedThreadCreatorRouteInput,
                    href: null,
                    routeSource: "chat_header",
                    currentRoute: "/dashboard/chat",
                    missingReason: missingProfileHrefReason,
                }));
            }
        }
    }, [
        canComposeFromFollowedCreators,
        chatProfileLinkActor,
        selectedThread,
        selectedThreadCreatorProfileHref,
        selectedThreadCreatorProfileMissingReason,
        selectedThreadCreatorRouteInput,
        showCompactThreadListOnly,
    ]);


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
                throw buildChatSafeError("chat_threads_non_json", "Chat threads could not be loaded right now.");
            }
            if (!response.ok) {
                throw buildChatSafeError("chat_threads_load_failed", "Chat threads could not be loaded right now.");
            }
            if (threadsLoadRequestIdRef.current !== requestId) {
                return;
            }

            const nextThreads = Array.isArray(body.threads) ? body.threads : [];
            setThreads(nextThreads);
            trackEvent("chat_thread_list_loaded", {
                source_component: "chat_thread_list_loader",
                route: "/dashboard/chat",
                display_mode: readChatDisplayMode(),
                platform_shell: isIosPwaChatShell ? "ios-pwa" : "default",
                user_id: user.uid,
                creator_id: creatorId || undefined,
                selected_thread_id: body.selectedThreadId ?? null,
                thread_count: nextThreads.length,
                background_load: background,
            });
            if (creatorId && body.selectedThreadId) {
                const resolvedThread = nextThreads.find((thread) => thread.id === body.selectedThreadId) ?? null;
                const autoResolvedKey = `${creatorId}:${body.selectedThreadId}`;
                if (autoResolvedThreadKeyRef.current !== autoResolvedKey) {
                    autoResolvedThreadKeyRef.current = autoResolvedKey;
                    trackEvent("chat_thread_auto_created_or_resolved", {
                        source_component: "chat_thread_list_loader",
                        route: "/dashboard/chat",
                        creator_id: creatorId,
                        creator_first_name: resolvedThread ? readCreatorFirstName(resolvedThread.counterpartDisplayName) : undefined,
                        thread_id: body.selectedThreadId,
                    });
                }
            }
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
                toast.error("Chat threads could not be loaded right now.");
            }
        } finally {
            if (!background) {
                setThreadsLoading(false);
            }
        }
    }, [creatorId, isCompactViewport, isIosPwaChatShell, user]);

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
                throw buildChatSafeError("followed_creators_non_json", "Failed to load followed creators.");
            }
            if (!response.ok) {
                throw buildChatSafeError("followed_creators_load_failed", "Failed to load followed creators.");
            }

            setFollowedCreators(Array.isArray(body.followedCreators) ? body.followedCreators : []);
            setRecommendedCreators(Array.isArray(body.recommendedCreators) ? body.recommendedCreators : []);
        } catch (error) {
            reportClientIssue({
                channel: "runtime",
                severity: "warn",
                message: "Followed creators load failed for chat compose",
                error,
                consoleLabel: "[Chat] followed creators load failed",
            });
            setFollowedCreators([]);
            setRecommendedCreators([]);
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
                throw buildChatSafeError("chat_thread_detail_non_json", "This chat thread could not be loaded right now.");
            }
            if (!response.ok) {
                throw buildChatSafeError("chat_thread_detail_load_failed", "This chat thread could not be loaded right now.");
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
                toast.error("This chat thread could not be loaded right now.");
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
        if (threadsLoading || followedCreators.length > 0 || selectedThreadId) {
            noFollowPromptViewedRef.current = false;
            return;
        }

        if (noFollowPromptViewedRef.current) {
            return;
        }

        noFollowPromptViewedRef.current = true;
        trackEvent("chat_no_followed_creators_prompt_viewed", {
            source_component: "chat_thread_list_empty_state",
            route: "/dashboard/chat",
        });
    }, [followedCreators.length, selectedThreadId, threadsLoading]);

    useEffect(() => {
        if (threadsLoading || selectedThreadId) {
            emptyStateViewedKeyRef.current = null;
            return;
        }
        const state = followedCreators.length > 0 ? "start_creator_chat" : "follow_creator_first";
        const key = `${state}:${isIosPwaChatShell ? "ios-pwa" : "default"}`;
        if (emptyStateViewedKeyRef.current === key) {
            return;
        }
        emptyStateViewedKeyRef.current = key;
        trackEvent("chat_empty_state_viewed", {
            source_component: "chat_thread_list_empty_state",
            route: "/dashboard/chat",
            state,
            platform_shell: isIosPwaChatShell ? "ios-pwa" : "default",
        });
    }, [followedCreators.length, isIosPwaChatShell, selectedThreadId, threadsLoading]);

    useEffect(() => {
        if (!proactivePaidGdGateVisible || !selectedThread) {
            paidGdGateViewedKeyRef.current = null;
            return;
        }

        const nextKey = `${selectedThread.id}:${proactivePaidGdGate?.requiredMinPaidGd}:${proactivePaidGdGate?.purchasedBalanceGd}`;
        if (paidGdGateViewedKeyRef.current === nextKey) {
            return;
        }

        paidGdGateViewedKeyRef.current = nextKey;
        trackEvent("chat_paid_gd_gate_viewed", {
            source_component: "chat_paid_gd_guidance_card",
            route: "/dashboard/chat",
            creator_id: selectedThread.creatorId,
            creator_first_name: selectedThreadCreatorFirstName,
            thread_id: selectedThread.id,
            paid_balance_gd: proactivePaidGdGate?.purchasedBalanceGd,
            required_min_paid_gd: proactivePaidGdGate?.requiredMinPaidGd,
            subscriber_free_chat_applies: proactivePaidGdGate?.subscriberFreeChatApplies,
        });
        trackEvent("chat_insufficient_paid_gd_viewed", {
            source_component: "chat_paid_gd_guidance_card",
            route: "/dashboard/chat",
            creator_id: selectedThread.creatorId,
            creator_first_name: selectedThreadCreatorFirstName,
            thread_id: selectedThread.id,
            paid_balance_gd: proactivePaidGdGate?.purchasedBalanceGd,
            required_min_paid_gd: proactivePaidGdGate?.requiredMinPaidGd,
            paid_gd_shortfall: proactivePaidGdGate?.paidGdShortfall,
            subscriber_free_chat_applies: proactivePaidGdGate?.subscriberFreeChatApplies,
            debug_lane: "Chat gating/moderation",
        });
    }, [proactivePaidGdGate, proactivePaidGdGateVisible, selectedThread, selectedThreadCreatorFirstName]);

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
        setSelectedThreadIds((current) => current.filter((threadId) => visibleThreadIdSet.has(threadId)));
    }, [visibleThreadIdSet]);
    useEffect(() => {
        if (!user || !userProfile) {
            return;
        }

        const viewerField = liveViewerRole === "creator" ? "creatorId" : "userId";
        let active = true;

        const observerControl = createAutoHealingObserver(() => {
            if (!active) return;
            deferChatRealtimeTelemetry({
                eventName: "chat_realtime_listener_attached",
                userId: user.uid,
                listenerScope: "viewer_scoped_thread_list",
                propagationState: "stale",
                sourceComponent: "chat_thread_list",
                documentLimit: CHAT_THREAD_LISTENER_LIMIT,
            });
            return onSnapshot(
                query(collection(db, CHAT_COLLECTIONS.threads), where(viewerField, "==", user.uid), limit(CHAT_THREAD_LISTENER_LIMIT)),
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

                    if (nextThreads.some((thread) => thread.unreadCount > 0)) {
                        deferChatRealtimeTelemetry({
                            eventName: "chat_thread_unread_updated",
                            userId: user.uid,
                            listenerScope: "viewer_scoped_thread_list",
                            propagationState: "listener_observed",
                            sourceComponent: "chat_thread_list",
                            documentLimit: CHAT_THREAD_LISTENER_LIMIT,
                        });
                    }
                    setThreads((current) => mergeThreads(
                        nextThreads,
                        selectedDetailThreadRef.current ?? current.find((thread) => thread.id === selectedThreadIdRef.current) ?? null,
                    ));
                },
                (error: unknown) => {
                    if (!active) return;
                    deferChatRealtimeTelemetry({
                        eventName: "chat_realtime_listener_error",
                        userId: user.uid,
                        listenerScope: "viewer_scoped_thread_list",
                        propagationState: "failed",
                        sourceComponent: "chat_thread_list",
                        errorMessage: readChatDiagnosticCode(error, "chat_threads_load_failed"),
                    });
                    observerControl.triggerReconnect(error);
                },
            );
        }, (error: unknown) => {
            deferChatRealtimeIssue(CHAT_THREAD_LIST_SCOPE, error, {
                creatorId: creatorId || null,
            });
        });

        return () => {
            active = false;
            deferChatRealtimeTelemetry({
                eventName: "chat_realtime_listener_detached",
                userId: user.uid,
                listenerScope: "viewer_scoped_thread_list",
                propagationState: "stale",
                sourceComponent: "chat_thread_list",
                documentLimit: CHAT_THREAD_LISTENER_LIMIT,
            });
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
            deferChatRealtimeTelemetry({
                eventName: "chat_realtime_listener_attached",
                userId: user.uid,
                threadId: selectedThreadId,
                listenerScope: "selected_thread_messages_only",
                propagationState: "stale",
                sourceComponent: "chat_thread_messages",
                documentLimit: CHAT_MESSAGE_LISTENER_LIMIT,
            });
            return onSnapshot(
                query(
                    collection(db, CHAT_COLLECTIONS.messages),
                    where("threadId", "==", selectedThreadId),
                    where(viewerField, "==", user.uid),
                    limit(CHAT_MESSAGE_LISTENER_LIMIT)
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
    
                    deferChatRealtimeTelemetry({
                        eventName: "chat_message_listener_observed",
                        userId: user.uid,
                        threadId: selectedThreadId,
                        messageId: nextMessages[nextMessages.length - 1]?.id ?? null,
                        listenerScope: "selected_thread_messages_only",
                        propagationState: "listener_observed",
                        sourceComponent: "chat_thread_messages",
                        documentLimit: CHAT_MESSAGE_LISTENER_LIMIT,
                    });
                    setSelectedDetail((current) => current ? {
                        ...current,
                        messages: nextMessages,
                    } : current);
                },
                (error: unknown) => {
                    if (!active) return;
                    deferChatRealtimeTelemetry({
                        eventName: "chat_realtime_listener_error",
                        userId: user.uid,
                        threadId: selectedThreadId,
                        listenerScope: "selected_thread_messages_only",
                        propagationState: "failed",
                        sourceComponent: "chat_thread_messages",
                        errorMessage: readChatDiagnosticCode(error, "chat_thread_detail_load_failed"),
                    });
                    observerControl.triggerReconnect(error);
                },
            );
        }, (error: unknown) => {
            deferChatRealtimeIssue(CHAT_MESSAGES_SCOPE, error, {
                threadId: selectedThreadId,
            });
        });

        return () => {
            active = false;
            deferChatRealtimeTelemetry({
                eventName: "chat_realtime_listener_detached",
                userId: user.uid,
                threadId: selectedThreadId,
                listenerScope: "selected_thread_messages_only",
                propagationState: "stale",
                sourceComponent: "chat_thread_messages",
                documentLimit: CHAT_MESSAGE_LISTENER_LIMIT,
            });
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
        deferChatRealtimeTelemetry({
            eventName: "chat_thread_read_marked",
            userId: user?.uid,
            threadId: selectedThreadId,
            messageId: latestMessage.id,
            listenerScope: "selected_thread_messages_only",
            propagationState: "listener_observed",
            sourceComponent: "chat_thread_messages",
        });
        void authFetch(`/api/chat/threads/${encodeURIComponent(selectedThreadId)}/read`, {
            method: "POST",
        }).catch((error) => {
            deferChatDiagnosticReport({
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
        trackEvent("chat_new_message_sheet_creator_selected", {
            source_component: "chat_new_message_sheet",
            route: "/dashboard/chat",
            platform_shell: isIosPwaChatShell ? "ios-pwa" : "default",
            creator_id: nextCreatorId,
        });
        trackEvent("chat_creator_selected", {
            source_component: "chat_new_message_sheet",
            route: "/dashboard/chat",
            platform_shell: isIosPwaChatShell ? "ios-pwa" : "default",
            user_id: user?.uid ?? undefined,
            creator_id: nextCreatorId,
            target_creator_id: nextCreatorId,
        });
        setComposePickerOpen(false);
        setSelectedThreadId(null);
        setSelectedDetail(null);
        router.replace(`/dashboard/chat?creator=${encodeURIComponent(nextCreatorId)}`, { scroll: false });
    }, [isIosPwaChatShell, router, user?.uid]);

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

    const openComposePicker = useCallback((sourceComponent: string, nextCreatorId?: string | null) => {
        setComposePickerOpen(true);
        trackEvent("chat_new_message_sheet_opened", {
            source_component: sourceComponent,
            route: "/dashboard/chat",
            platform_shell: isIosPwaChatShell ? "ios-pwa" : "default",
            creator_id: nextCreatorId ?? null,
        });
        deferChatComposeSheetOpenedTelemetry({
            sourceComponent,
            userId: user?.uid,
            creatorId: nextCreatorId ?? null,
        });
    }, [isIosPwaChatShell, user?.uid]);

    const openChatPaidGdPurchaseModal = useCallback((sourceComponent: string) => {
        trackEvent("chat_paid_gd_gate_primary_clicked", {
            source_component: sourceComponent,
            route: "/dashboard/chat",
            creator_id: selectedThread?.creatorId,
            creator_first_name: selectedThreadCreatorFirstName,
            thread_id: selectedThread?.id,
            paid_balance_gd: proactivePaidGdGate?.purchasedBalanceGd,
            required_min_paid_gd: proactivePaidGdGate?.requiredMinPaidGd,
            subscriber_free_chat_applies: proactivePaidGdGate?.subscriberFreeChatApplies,
        });
        trackEvent("chat_purchase_cta_clicked", {
            source_component: sourceComponent,
            route: "/dashboard/chat",
            creator_id: selectedThread?.creatorId,
            creator_first_name: selectedThreadCreatorFirstName,
            thread_id: selectedThread?.id,
            paid_balance_gd: proactivePaidGdGate?.purchasedBalanceGd,
            required_min_paid_gd: proactivePaidGdGate?.requiredMinPaidGd,
            paid_gd_shortfall: insufficientFunds?.paidGdShortfall,
            debug_lane: "Chat gating/moderation",
        });
        openPurchaseModal(resolveChatPaidGdPurchaseTarget(proactivePaidGdGate, insufficientFunds?.paidGdShortfall));
    }, [insufficientFunds?.paidGdShortfall, openPurchaseModal, proactivePaidGdGate, selectedThread, selectedThreadCreatorFirstName]);

    const goUnwrapDropsForChat = useCallback((sourceComponent: string) => {
        trackEvent("chat_paid_gd_gate_secondary_clicked", {
            source_component: sourceComponent,
            route: "/dashboard/chat",
            creator_id: selectedThread?.creatorId,
            creator_first_name: selectedThreadCreatorFirstName,
            thread_id: selectedThread?.id,
            paid_balance_gd: proactivePaidGdGate?.purchasedBalanceGd,
            required_min_paid_gd: proactivePaidGdGate?.requiredMinPaidGd,
            subscriber_free_chat_applies: proactivePaidGdGate?.subscriberFreeChatApplies,
        });
        router.push("/drops");
    }, [proactivePaidGdGate, router, selectedThread, selectedThreadCreatorFirstName]);

    const handleNoFollowCreatorsCtaClick = useCallback((target: "find_creators" | "browse_drops") => {
        trackEvent("chat_no_followed_creators_cta_clicked", {
            source_component: "chat_thread_list_empty_state",
            route: "/dashboard/chat",
            cta_target: target,
        });
    }, []);

    const handleIceBreakerInsert = useCallback((text: string) => {
        setComposerText(text);
        trackEvent("chat_icebreaker_inserted", {
            source_component: "chat_thread_empty_state",
            route: "/dashboard/chat",
            creator_id: selectedThread?.creatorId ?? null,
            platform_shell: isIosPwaChatShell ? "ios-pwa" : "default",
        });
    }, [isIosPwaChatShell, selectedThread?.creatorId]);

    const handleThreadSearchFocus = useCallback(() => {
        deferChatListSearchFocusedTelemetry({
            sourceComponent: "chat_list_search",
            userId: user?.uid,
        });
    }, [user?.uid]);

    const openThreadFromList = useCallback((thread: ChatThreadRecord) => {
        if (threadSelectionMode) {
            toggleThreadSelection(thread.id);
            return;
        }

        setSelectedThreadId(thread.id);
        deferChatThreadOpenedTelemetry({
            sourceComponent: "chat_thread_list_item",
            userId: user?.uid,
            thread,
        });
    }, [threadSelectionMode, toggleThreadSelection, user?.uid]);

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
                    throw buildChatSafeError("chat_read_update_failed", "Chat read update failed.");
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
                toast.error(`Some conversations could not be marked as read.`);
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
                    throw buildChatSafeError("chat_delete_failed", "Selected conversations could not be deleted right now.");
                }
            }));
            const failedCount = results.filter((result) => result.status === "rejected").length;
            if (failedCount === selectedThreadIds.length) {
                throw buildChatSafeError("chat_delete_failed", "Selected conversations could not be deleted right now.");
            }

            setThreads((current) => current.filter((thread) => !selectedThreadIds.includes(thread.id)));
            exitThreadSelectionMode();
            if (failedCount > 0) {
                toast.error("Some conversations could not be deleted.");
            }
        } catch (error) {
            toast.error("Selected conversations could not be deleted right now.");
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

        const syncPresence = (typing: boolean, reason: ChatTypingIntentReason) => set(ownPresenceRef, buildChatPresencePayload({
            typing,
            activeAt: Date.now(),
            role: selectedThread.viewerRole,
            threadId: selectedThreadId,
            userId: user.uid,
            displayName: userProfile?.displayName || user.displayName || user.email || "User",
        })).catch((error) => {
            if (!cancelled) {
                deferChatPresenceTelemetry({
                    eventName: "chat_presence_error",
                    userId: user.uid,
                    threadId: selectedThreadId,
                    typing,
                    reason,
                    errorMessage: readChatDiagnosticCode(error, "chat_threads_load_failed"),
                });
                deferChatRealtimeIssue("chat presence write", error, {
                    threadId: selectedThreadId,
                });
            }
        });

        void onDisconnect(ownPresenceRef).remove().then(() => {
            if (!cancelled) {
                deferChatPresenceTelemetry({
                    eventName: "chat_presence_connected",
                    userId: user.uid,
                    threadId: selectedThreadId,
                    typing: false,
                    reason: "connect",
                });
            }
        }).catch((error) => {
            if (!cancelled) {
                deferChatPresenceTelemetry({
                    eventName: "chat_presence_error",
                    userId: user.uid,
                    threadId: selectedThreadId,
                    typing: false,
                    reason: "on_disconnect",
                    errorMessage: readChatDiagnosticCode(error, "chat_thread_detail_load_failed"),
                });
            }
        });
        void syncPresence(false, "clear");
        heartbeatTimer = window.setInterval(() => {
            void syncPresence(typingControllerStateRef.current.currentTyping, "input");
        }, CHAT_PRESENCE_CONTRACT.presence.heartbeatMs);

        const unsubscribe = onValue(counterpartPresenceRef, (snapshot) => {
            setPresence(normalizeChatPresenceSnapshot(snapshot.val(), Date.now()));
        }, (error) => {
            deferChatPresenceTelemetry({
                eventName: "chat_presence_error",
                userId: user.uid,
                threadId: selectedThreadId,
                typing: false,
                reason: "read",
                errorMessage: readChatDiagnosticCode(error, "chat_read_update_failed"),
            });
            deferChatRealtimeIssue("chat presence read", error, {
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
            typingControllerStateRef.current.currentTyping = false;
            void syncPresence(false, "unmount");
            deferChatPresenceTelemetry({
                eventName: "chat_presence_disconnected",
                userId: user.uid,
                threadId: selectedThreadId,
                typing: false,
                reason: "unmount",
            });
            void remove(ownPresenceRef).catch(() => undefined);
            unsubscribe();
        };
    }, [selectedThread, selectedThreadId, user, userProfile?.displayName]);

    const pushTypingState = useCallback((typing: boolean, reason: ChatTypingIntentReason = "input") => {
        if (!selectedThreadId || !user) {
            return;
        }

        const nowMs = Date.now();
        const decision = resolveChatTypingIntent({
            state: typingControllerStateRef.current,
            nextTyping: typing,
            nowMs,
            reason,
        });
        if (!decision.shouldWrite) {
            return;
        }

        const ownPresenceRef = ref(rtdb, buildChatPresenceMemberPath(selectedThreadId, user.uid));
        const nextTyping = decision.writePayload?.typing ?? typing;
        void set(ownPresenceRef, buildChatPresencePayload({
            typing: nextTyping,
            activeAt: decision.writePayload?.activeAt ?? nowMs,
            role: selectedThread?.viewerRole || "user",
            threadId: selectedThreadId,
            userId: user.uid,
            displayName: userProfile?.displayName || user.displayName || user.email || "User",
        })).catch((error) => {
            deferChatPresenceTelemetry({
                eventName: "chat_presence_error",
                userId: user.uid,
                threadId: selectedThreadId,
                typing: nextTyping,
                reason,
                errorMessage: readChatDiagnosticCode(error, "chat_delete_failed"),
            });
            deferChatRealtimeIssue("chat typing write", error, {
                threadId: selectedThreadId,
            });
        });
        if (decision.telemetryEvent) {
            deferChatPresenceTelemetry({
                eventName: decision.telemetryEvent,
                userId: user.uid,
                threadId: selectedThreadId,
                typing: nextTyping,
                reason,
            });
        }
    }, [selectedThread?.viewerRole, selectedThreadId, user, userProfile?.displayName]);

    const handleComposerTextChange = useCallback((value: string) => {
        setComposerText(value);
        const hasText = value.trim().length > 0;
        pushTypingState(hasText, hasText ? "input" : "clear");

        if (typingResetTimerRef.current) {
            window.clearTimeout(typingResetTimerRef.current);
        }

        typingResetTimerRef.current = window.setTimeout(() => {
            pushTypingState(false, "timeout");
        }, CHAT_PRESENCE_CONTRACT.typing.stopTimeoutMs);
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
            trackEvent("media_upload_blocked_type", buildChatMediaUploadPayload({
                eventName: "media_upload_blocked_type",
                uploadId: `blocked_type:${Date.now()}`,
                userId: user?.uid ?? null,
                threadId: selectedThreadId,
                mediaKind: "image",
                mimeType: file.type || "application/octet-stream",
                sizeBytes: file.size,
                maxBytes: chatFanPassActive ? CHAT_MEDIA_LIMIT_BYTES_FAN_PASS : CHAT_MEDIA_LIMIT_BYTES_DEFAULT,
                status: "blocked",
                failureReason: "unsupported_attachment_type",
            }));
            trackEvent("chat_media_upload_blocked", {
                source_component: "chat_thread_composer",
                route: "/dashboard/chat",
                platform_shell: isIosPwaChatShell ? "ios-pwa" : "default",
                file_size_bytes: file.size,
                mime_type: file.type || "application/octet-stream",
                error_code: "unsupported_attachment_type",
                debug_lane: "Chat gating/moderation",
            });
            toast.error("Only image and video files can be attached in chat.");
            return;
        }

        const maxBytes = chatFanPassActive ? CHAT_MEDIA_LIMIT_BYTES_FAN_PASS : CHAT_MEDIA_LIMIT_BYTES_DEFAULT;
        if (file.size > maxBytes) {
            const message = chatFanPassActive
                ? "This file is too large. Fan Pass uploads support up to 500 MB. Please upload a smaller file."
                : "This file is too large. Chat uploads are limited to 25 MB unless you have a Fan Pass.";
            const errorCode = chatFanPassActive ? "fan_pass_file_limit_exceeded" : "file_too_large_requires_fan_pass";
            trackEvent("media_upload_blocked_size", buildChatMediaUploadPayload({
                eventName: "media_upload_blocked_size",
                uploadId: `blocked_size:${Date.now()}`,
                userId: user?.uid ?? null,
                threadId: selectedThreadId,
                mediaKind: attachmentKind,
                mimeType: file.type || "application/octet-stream",
                sizeBytes: file.size,
                maxBytes,
                status: "blocked",
                failureReason: errorCode,
            }));
            trackEvent("chat_media_file_rejected_size", {
                source_component: "chat_thread_composer",
                route: "/dashboard/chat",
                platform_shell: isIosPwaChatShell ? "ios-pwa" : "default",
                file_size_bytes: file.size,
                max_size_bytes: maxBytes,
                has_fan_pass: chatFanPassActive,
                error_code: errorCode,
            });
            trackEvent("chat_media_upload_blocked", {
                source_component: "chat_thread_composer",
                route: "/dashboard/chat",
                platform_shell: isIosPwaChatShell ? "ios-pwa" : "default",
                file_size_bytes: file.size,
                max_size_bytes: maxBytes,
                has_fan_pass: chatFanPassActive,
                error_code: errorCode,
                debug_lane: "Chat gating/moderation",
            });
            setSendErrorMessage(message);
            if (!chatFanPassActive && selectedThreadCreatorProfileHref) {
                toast.error(message, {
                    action: {
                        label: "View Fan Pass",
                        onClick: () => router.push(selectedThreadCreatorProfileHref),
                    },
                });
            } else {
                toast.error(message);
            }
            return;
        }

        if (chatFanPassActive && file.size > CHAT_MEDIA_LIMIT_BYTES_DEFAULT) {
            trackEvent("chat_media_file_allowed_fan_pass", {
                source_component: "chat_thread_composer",
                route: "/dashboard/chat",
                platform_shell: isIosPwaChatShell ? "ios-pwa" : "default",
                file_size_bytes: file.size,
                max_size_bytes: CHAT_MEDIA_LIMIT_BYTES_FAN_PASS,
                has_fan_pass: true,
            });
        }

        setComposerFile(file);
        setComposerKind(attachmentKind);
    }, [chatFanPassActive, isIosPwaChatShell, router, selectedThreadCreatorProfileHref, selectedThreadId, user?.uid]);

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
                throw buildChatSafeError("attachment_cleanup_non_json", "Failed to clean up chat attachment.");
            }
            if (!response.ok) {
                throw buildChatSafeError("attachment_cleanup_failed", "Failed to clean up chat attachment.");
            }

            return true;
        } catch (error) {
            reportStorageIssue("chat attachment cleanup", error, {
                storagePathFingerprint: fingerprintStoragePath(storagePath),
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
            throw buildChatSafeError("unsupported_attachment_type", "Only image and video files can be attached in chat.");
        }

        let preparedStoragePath: string | null = null;
        let uploadId = buildChatAttachmentUploadCorrelationId(selectedThreadId);
        const correlationId = uploadId;
        const uploadStartedAt = Date.now();
        const maxBytes = chatFanPassActive ? CHAT_MEDIA_LIMIT_BYTES_FAN_PASS : CHAT_MEDIA_LIMIT_BYTES_DEFAULT;
        let uploadPhase: "prepare" | "storage" | "complete" = "prepare";
        let lifecycleFailureTracked = false;
        try {
            trackEvent("chat_attachment_upload_started", {
                source_component: "chat_thread_composer",
                route: "/dashboard/chat",
                user_id: user.uid,
                thread_id: selectedThreadId,
                message_kind: attachmentKind,
                file_size_bytes: composerFile.size,
                mime_type: composerFile.type || "application/octet-stream",
            });
            trackEvent("media_upload_prepare_started", buildChatMediaUploadPayload({
                eventName: "media_upload_prepare_started",
                uploadId,
                correlationId,
                userId: user.uid,
                threadId: selectedThreadId,
                mediaKind: attachmentKind,
                mimeType: composerFile.type || "application/octet-stream",
                sizeBytes: composerFile.size,
                maxBytes,
                status: "prepare_started",
                durationMs: 0,
            }));
            const prepareResponse = await authFetch("/api/chat/attachments/prepare", {
                method: "POST",
                body: JSON.stringify({
                    threadId: selectedThreadId,
                    fileName: composerFile.name,
                    mimeType: composerFile.type || "application/octet-stream",
                    sizeBytes: composerFile.size,
                    idempotencyKey: correlationId,
                }),
            });
            let prepareBody = {} as { error?: string } & Partial<ChatAttachmentPrepareResponse>;
            const prepareRawText = await prepareResponse.text().catch(() => "");
            try {
                prepareBody = JSON.parse(prepareRawText) as typeof prepareBody;
            } catch {
                throw buildChatSafeError("attachment_prepare_non_json", "We couldn't send your message. Try again shortly.");
            }
            if (!prepareResponse.ok || !prepareBody.storagePath) {
                const typedMessage = buildChatSendErrorMessage({
                    error: prepareBody.error,
                    errorCode: prepareBody.errorCode,
                });
                trackEvent("media_upload_prepare_failed", buildChatMediaUploadPayload({
                    eventName: "media_upload_prepare_failed",
                    uploadId,
                    correlationId,
                    userId: user.uid,
                    threadId: selectedThreadId,
                    mediaKind: attachmentKind,
                    mimeType: composerFile.type || "application/octet-stream",
                    sizeBytes: composerFile.size,
                    maxBytes: prepareBody.maxBytes ?? maxBytes,
                    status: "failed",
                    failureReason: prepareBody.errorCode ?? "prepare_failed",
                    durationMs: Date.now() - uploadStartedAt,
                }));
                lifecycleFailureTracked = true;
                throw buildChatSafeError("attachment_prepare_failed", typedMessage);
            }
            preparedStoragePath = prepareBody.storagePath;
            uploadId = prepareBody.uploadId ?? uploadId;
            trackEvent("media_upload_prepare_completed", buildChatMediaUploadPayload({
                eventName: "media_upload_prepare_completed",
                uploadId,
                correlationId: prepareBody.correlationId ?? correlationId,
                userId: user.uid,
                threadId: selectedThreadId,
                mediaKind: attachmentKind,
                mimeType: prepareBody.mimeType || composerFile.type || "application/octet-stream",
                sizeBytes: composerFile.size,
                maxBytes,
                storagePath: prepareBody.storagePath,
                status: "prepared",
                durationMs: Date.now() - uploadStartedAt,
            }));

            const target = storageRef(storage, prepareBody.storagePath);
            uploadPhase = "storage";
            trackEvent("media_storage_upload_started", buildChatMediaUploadPayload({
                eventName: "media_storage_upload_started",
                uploadId,
                correlationId: prepareBody.correlationId ?? correlationId,
                userId: user.uid,
                threadId: selectedThreadId,
                mediaKind: attachmentKind,
                mimeType: prepareBody.mimeType || composerFile.type || "application/octet-stream",
                sizeBytes: composerFile.size,
                maxBytes,
                storagePath: prepareBody.storagePath,
                status: "storage_started",
                durationMs: Date.now() - uploadStartedAt,
            }));
            await uploadBytes(target, composerFile, {
                contentType: prepareBody.mimeType || composerFile.type || "application/octet-stream",
            });
            trackEvent("media_storage_upload_completed", buildChatMediaUploadPayload({
                eventName: "media_storage_upload_completed",
                uploadId,
                correlationId: prepareBody.correlationId ?? correlationId,
                userId: user.uid,
                threadId: selectedThreadId,
                mediaKind: attachmentKind,
                mimeType: prepareBody.mimeType || composerFile.type || "application/octet-stream",
                sizeBytes: composerFile.size,
                maxBytes,
                storagePath: prepareBody.storagePath,
                status: "storage_completed",
                durationMs: Date.now() - uploadStartedAt,
            }));

            uploadPhase = "complete";
            trackEvent("media_upload_complete_started", buildChatMediaUploadPayload({
                eventName: "media_upload_complete_started",
                uploadId,
                correlationId: prepareBody.correlationId ?? correlationId,
                userId: user.uid,
                threadId: selectedThreadId,
                mediaKind: attachmentKind,
                mimeType: prepareBody.mimeType || composerFile.type || "application/octet-stream",
                sizeBytes: composerFile.size,
                maxBytes,
                storagePath: prepareBody.storagePath,
                status: "complete_started",
                durationMs: Date.now() - uploadStartedAt,
            }));
            const completeResponse = await authFetch("/api/chat/attachments/complete", {
                method: "POST",
                body: JSON.stringify({
                    threadId: selectedThreadId,
                    storagePath: prepareBody.storagePath,
                    fileName: prepareBody.fileName || composerFile.name,
                    mimeType: prepareBody.mimeType || composerFile.type || "application/octet-stream",
                    uploadId,
                    correlationId: prepareBody.correlationId ?? correlationId,
                    idempotencyKey: correlationId,
                }),
            });
            let completeBody = {} as { error?: string } & Partial<ChatAttachmentCompleteResponse>;
            const completeRawText = await completeResponse.text().catch(() => "");
            try {
                completeBody = JSON.parse(completeRawText) as typeof completeBody;
            } catch {
                throw buildChatSafeError("attachment_complete_non_json", "We couldn't send your message. Try again shortly.");
            }
            if (!completeResponse.ok || !completeBody.assetUrl) {
                const typedMessage = buildChatSendErrorMessage({
                    error: completeBody.error,
                    errorCode: completeBody.errorCode,
                });
                trackEvent("media_upload_complete_failed", buildChatMediaUploadPayload({
                    eventName: "media_upload_complete_failed",
                    uploadId,
                    correlationId: completeBody.correlationId ?? prepareBody.correlationId ?? correlationId,
                    userId: user.uid,
                    threadId: selectedThreadId,
                    mediaKind: attachmentKind,
                    mimeType: prepareBody.mimeType || composerFile.type || "application/octet-stream",
                    sizeBytes: composerFile.size,
                    maxBytes: completeBody.maxBytes ?? maxBytes,
                    storagePath: prepareBody.storagePath,
                    status: "failed",
                    failureReason: completeBody.errorCode ?? "complete_failed",
                    durationMs: Date.now() - uploadStartedAt,
                }));
                lifecycleFailureTracked = true;
                throw buildChatSafeError("attachment_complete_failed", typedMessage);
            }
            trackEvent("media_upload_complete_completed", buildChatMediaUploadPayload({
                eventName: "media_upload_complete_completed",
                uploadId: completeBody.uploadId ?? uploadId,
                correlationId: completeBody.correlationId ?? prepareBody.correlationId ?? correlationId,
                userId: user.uid,
                threadId: selectedThreadId,
                mediaKind: attachmentKind,
                mimeType: completeBody.assetMimeType || prepareBody.mimeType || composerFile.type || "application/octet-stream",
                sizeBytes: completeBody.sizeBytes ?? composerFile.size,
                maxBytes,
                storagePath: completeBody.storagePath || prepareBody.storagePath,
                status: "completed",
                durationMs: Date.now() - uploadStartedAt,
            }));

            return {
                assetUrl: completeBody.assetUrl,
                assetName: completeBody.assetName || composerFile.name,
                assetMimeType: completeBody.assetMimeType || composerFile.type || "application/octet-stream",
                storagePath: completeBody.storagePath || prepareBody.storagePath,
            };
        } catch (error) {
            if (!lifecycleFailureTracked && uploadPhase === "prepare" && !preparedStoragePath) {
                trackEvent("media_upload_prepare_failed", buildChatMediaUploadPayload({
                    eventName: "media_upload_prepare_failed",
                    uploadId,
                    correlationId,
                    userId: user.uid,
                    threadId: selectedThreadId,
                    mediaKind: attachmentKind,
                    mimeType: composerFile.type || "application/octet-stream",
                    sizeBytes: composerFile.size,
                    maxBytes,
                    status: "failed",
                    failureReason: readChatDiagnosticCode(error, "attachment_prepare_failed"),
                    durationMs: Date.now() - uploadStartedAt,
                }));
            }
            if (!lifecycleFailureTracked && uploadPhase === "storage" && preparedStoragePath) {
                trackEvent("media_storage_upload_failed", buildChatMediaUploadPayload({
                    eventName: "media_storage_upload_failed",
                    uploadId,
                    correlationId,
                    userId: user.uid,
                    threadId: selectedThreadId,
                    mediaKind: attachmentKind,
                    mimeType: composerFile.type || "application/octet-stream",
                    sizeBytes: composerFile.size,
                    maxBytes,
                    storagePath: preparedStoragePath,
                    status: "failed",
                    failureReason: readChatDiagnosticCode(error, "storage_upload_failed"),
                    durationMs: Date.now() - uploadStartedAt,
                }));
            }
            if (!lifecycleFailureTracked && uploadPhase === "complete" && preparedStoragePath) {
                trackEvent("media_upload_complete_failed", buildChatMediaUploadPayload({
                    eventName: "media_upload_complete_failed",
                    uploadId,
                    correlationId,
                    userId: user.uid,
                    threadId: selectedThreadId,
                    mediaKind: attachmentKind,
                    mimeType: composerFile.type || "application/octet-stream",
                    sizeBytes: composerFile.size,
                    maxBytes,
                    storagePath: preparedStoragePath,
                    status: "failed",
                    failureReason: readChatDiagnosticCode(error, "attachment_complete_failed"),
                    durationMs: Date.now() - uploadStartedAt,
                }));
            }
            if (preparedStoragePath) {
                await discardUploadedAttachment(preparedStoragePath);
                trackEvent("media_upload_cancelled", buildChatMediaUploadPayload({
                    eventName: "media_upload_cancelled",
                    uploadId,
                    correlationId,
                    userId: user.uid,
                    threadId: selectedThreadId,
                    mediaKind: attachmentKind,
                    mimeType: composerFile.type || "application/octet-stream",
                    sizeBytes: composerFile.size,
                    maxBytes,
                    storagePath: preparedStoragePath,
                    status: "cancelled",
                    failureReason: "cleanup_after_failed_upload",
                    durationMs: Date.now() - uploadStartedAt,
                }));
            }
            reportStorageIssue("chat attachment upload", error, {
                fileName: composerFile.name,
                mimeType: composerFile.type,
                threadId: selectedThreadId,
                storagePathFingerprint: fingerprintStoragePath(preparedStoragePath),
            });
            trackEvent("chat_attachment_upload_failed", {
                source_component: "chat_thread_composer",
                route: "/dashboard/chat",
                user_id: user.uid,
                thread_id: selectedThreadId,
                message_kind: attachmentKind,
                file_size_bytes: composerFile.size,
                mime_type: composerFile.type || "application/octet-stream",
                error_code: readChatDiagnosticCode(error, "storage_upload_failed"),
                debug_lane: "Chat telemetry/admin truth",
            });
            throw error;
        }
    }, [chatFanPassActive, composerFile, discardUploadedAttachment, selectedThreadId, user]);

    const handleSendMessage = useCallback(async () => {
        if (!selectedThreadId || !selectedThread) {
            return;
        }

        if (proactivePaidGdGateVisible) {
            setInsufficientFunds({
                error: "You need more paid GumDrops before you can send this creator message.",
                errorCode: "insufficient_paid_gumdrops",
                requiredPriceGd: proactivePaidGdGate?.requiredMinPaidGd ?? 1,
                purchasedBalanceGd: proactivePaidGdGate?.purchasedBalanceGd ?? 0,
                paidGdShortfall: proactivePaidGdGate?.paidGdShortfall ?? 1,
                subscriberFreeChatApplies: proactivePaidGdGate?.subscriberFreeChatApplies ?? false,
                messageKind: composerKind,
            });
            trackEvent("chat_send_blocked", {
                source_component: "chat_thread_composer",
                route: "/dashboard/chat",
                creator_id: selectedThread.creatorId,
                thread_id: selectedThread.id,
                message_kind: composerKind,
                error_code: "insufficient_paid_gumdrops",
                required_price_gd: proactivePaidGdGate?.requiredMinPaidGd ?? 1,
                purchased_balance_gd: proactivePaidGdGate?.purchasedBalanceGd ?? 0,
                paid_gd_shortfall: proactivePaidGdGate?.paidGdShortfall ?? 1,
                debug_lane: "Chat gating/moderation",
            });
            trackEvent("chat_message_blocked", {
                source_component: "chat_thread_composer",
                route: "/dashboard/chat",
                user_id: user?.uid ?? undefined,
                creator_id: selectedThread.creatorId,
                target_creator_id: selectedThread.creatorId,
                thread_id: selectedThread.id,
                message_kind: composerKind,
                error_code: "insufficient_paid_gumdrops",
                required_price_gd: proactivePaidGdGate?.requiredMinPaidGd ?? 1,
                purchased_balance_gd: proactivePaidGdGate?.purchasedBalanceGd ?? 0,
                paid_gd_shortfall: proactivePaidGdGate?.paidGdShortfall ?? 1,
                debug_lane: "Chat telemetry/admin truth",
            });
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
        const idempotencyKey = buildChatMessageIdempotencyKey(selectedThreadId);
        let uploadedAttachment: UploadedChatAttachment | null = null;

        deferChatMessageSendAttemptedTelemetry({
            sourceComponent: "chat_thread_composer",
            userId: user?.uid,
            thread: selectedThread,
            idempotencyKey,
            messageKind: currentComposerKind,
            hasAttachment: Boolean(currentComposerFile),
        });

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
            pushTypingState(false, "send");
            deferChatRealtimeTelemetry({
                eventName: "chat_message_optimistic_rendered",
                userId: user?.uid,
                threadId: selectedThreadId,
                messageId: optimisticId,
                listenerScope: "selected_thread_messages_only",
                propagationState: "optimistic_rendered",
                sourceComponent: "chat_thread_composer",
            });
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
                    idempotencyKey,
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
            } catch {
                throw buildChatSafeError("chat_send_non_json", "We couldn't send your message. Try again shortly.");
            }

            if (!response.ok) {
                if (body.errorCode === "insufficient_paid_gumdrops") {
                    if (!currentComposerFile) {
                        setSelectedDetail((current) => current ? {
                            ...current,
                            messages: current.messages.filter((msg) => msg.id !== optimisticId),
                        } : current);
                    }
                    deferChatMessageSendFailedTelemetry({
                        sourceComponent: "chat_thread_composer",
                        userId: user?.uid,
                        thread: selectedThread,
                        idempotencyKey,
                        messageKind: currentComposerKind,
                        hasAttachment: Boolean(currentComposerFile),
                        errorCode: body.errorCode,
                        errorMessage: buildChatSendErrorMessage({ errorCode: body.errorCode }),
                    });
                    trackEvent("chat_send_blocked", {
                        source_component: "chat_thread_composer",
                        route: "/dashboard/chat",
                        creator_id: selectedThread.creatorId,
                        thread_id: selectedThread.id,
                        message_kind: currentComposerKind,
                        error_code: body.errorCode,
                        required_price_gd: body.requiredPriceGd,
                        purchased_balance_gd: body.purchasedBalanceGd,
                        paid_gd_shortfall: body.paidGdShortfall,
                        debug_lane: "Chat gating/moderation",
                    });
                    trackEvent("chat_message_blocked", {
                        source_component: "chat_thread_composer",
                        route: "/dashboard/chat",
                        user_id: user?.uid ?? undefined,
                        creator_id: selectedThread.creatorId,
                        target_creator_id: selectedThread.creatorId,
                        thread_id: selectedThread.id,
                        message_kind: currentComposerKind,
                        error_code: body.errorCode,
                        required_price_gd: body.requiredPriceGd,
                        purchased_balance_gd: body.purchasedBalanceGd,
                        paid_gd_shortfall: body.paidGdShortfall,
                        debug_lane: "Chat telemetry/admin truth",
                    });
                    setInsufficientFunds(body as ChatInsufficientFundsPayload);
                    return;
                }

                throw buildChatSafeError("chat_send_failed", buildChatSendErrorMessage(body));
            }

            deferChatRealtimeTelemetry({
                eventName: "chat_message_api_accepted",
                userId: user?.uid,
                threadId: selectedThreadId,
                messageId: body.message?.id ?? optimisticId,
                listenerScope: "selected_thread_messages_only",
                propagationState: "send_api_accepted",
                sourceComponent: "chat_thread_composer",
            });

            if (currentComposerFile) {
                setComposerText("");
                setComposerFile(null);
                setComposerKind("text");
                pushTypingState(false, "send");
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
                deferChatRealtimeTelemetry({
                    eventName: "chat_message_reconciled",
                    userId: user?.uid,
                    threadId: selectedThreadId,
                    messageId: persistedMessage.id,
                    listenerScope: "selected_thread_messages_only",
                    propagationState: "reconciled",
                    sourceComponent: "chat_thread_composer",
                });
            }
            deferChatMessageSentTelemetry({
                sourceComponent: "chat_thread_composer",
                userId: user?.uid,
                thread: body.thread ?? selectedThread,
                threadId: selectedThreadId,
                creatorId: selectedThread.creatorId,
                idempotencyKey,
                messageId: body.message?.id ?? null,
                messageKind: currentComposerKind,
                hasAttachment: Boolean(currentComposerFile),
            });
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
                ? "We couldn't send your message. The uploaded attachment could not be cleaned up automatically, and this was logged."
                : "We couldn't send your message. Try again shortly.";
            deferChatMessageSendFailedTelemetry({
                sourceComponent: "chat_thread_composer",
                userId: user?.uid,
                thread: selectedThread,
                idempotencyKey,
                messageKind: currentComposerKind,
                hasAttachment: Boolean(currentComposerFile),
                errorMessage: message,
            });
            deferChatRealtimeTelemetry({
                eventName: "chat_message_reconcile_failed",
                userId: user?.uid,
                threadId: selectedThreadId,
                messageId: optimisticId,
                listenerScope: "selected_thread_messages_only",
                propagationState: "failed",
                sourceComponent: "chat_thread_composer",
                errorMessage: message,
            });
            setSendErrorMessage(message);
            deferChatDiagnosticReport({
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
    }, [composerFile, composerKind, composerText, discardUploadedAttachment, proactivePaidGdGate, proactivePaidGdGateVisible, pushTypingState, selectedThread, selectedThreadId, uploadAttachment, user?.uid]);

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
        for (let index = selectedDetail.messages.length - 1; index >= 0; index -= 1) {
            const message = selectedDetail.messages[index];
            if (message.senderRole === viewerRole) {
                return message.id;
            }
        }

        return null;
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

    const restoreChatBottomAnchor = useCallback((reason: string, behavior: ScrollBehavior = "auto") => {
        if (typeof window === "undefined") {
            return;
        }

        const first = window.requestAnimationFrame(() => {
            const second = window.requestAnimationFrame(() => {
                scrollMessageListToBottom(behavior);
                trackEvent("chat_bottom_anchor_restored", {
                    source_component: "chat_transcript",
                    route: "/dashboard/chat",
                    platform_shell: isIosPwaChatShell ? "ios-pwa" : "default",
                    reason_code: reason,
                });
            });
            return () => window.cancelAnimationFrame(second);
        });
        return () => window.cancelAnimationFrame(first);
    }, [isIosPwaChatShell, scrollMessageListToBottom]);

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
        initialBottomAnchoredThreadRef.current = null;
        const cleanup = restoreChatBottomAnchor("thread_open", "auto");
        return () => {
            if (typeof cleanup === "function") {
                cleanup();
            }
        };
    }, [restoreChatBottomAnchor, selectedThreadId]);

    useEffect(() => {
        if (!selectedThreadId || !selectedDetail?.messages.length || initialBottomAnchoredThreadRef.current === selectedThreadId) {
            return;
        }

        initialBottomAnchoredThreadRef.current = selectedThreadId;
        shouldStickToBottomRef.current = true;
        let second: number | null = null;
        const first = window.requestAnimationFrame(() => {
            second = window.requestAnimationFrame(() => {
                scrollMessageListToBottom("auto");
            });
        });
        return () => {
            window.cancelAnimationFrame(first);
            if (second !== null) {
                window.cancelAnimationFrame(second);
            }
        };
    }, [scrollMessageListToBottom, selectedDetail?.messages.length, selectedThreadId]);

    useEffect(() => {
        if (!selectedDetail?.messages.length || !selectedThread) {
            return;
        }

        const latestMessage = selectedDetail.messages[selectedDetail.messages.length - 1];
        if (shouldStickToBottomRef.current || latestMessage.senderRole === selectedThread.viewerRole) {
            const frameId = window.requestAnimationFrame(() => {
                scrollMessageListToBottom(shouldStickToBottomRef.current ? "smooth" : "auto");
            });
            return () => window.cancelAnimationFrame(frameId);
        }
    }, [latestMessageSnapshot, scrollMessageListToBottom, selectedDetail?.messages, selectedThread]);

    useEffect(() => {
        if (!isIosPwaChatShell || !selectedThreadId || !messageListRef.current) {
            return;
        }

        const scrollNode = messageListRef.current;
        if (!(scrollNode instanceof HTMLElement) || typeof ResizeObserver !== "function") {
            return;
        }

        const observer = new ResizeObserver(() => {
            if (!shouldStickToBottomRef.current) {
                return;
            }
            restoreChatBottomAnchor("transcript_resize", "auto");
        });
        observer.observe(scrollNode);
        return () => observer.disconnect();
    }, [isIosPwaChatShell, restoreChatBottomAnchor, selectedThreadId]);

    useEffect(() => {
        if (!selectedThreadId) {
            return;
        }

        const node = messageListRef.current;
        if (!node) {
            return;
        }

        const mediaNodes = node.querySelectorAll("img,video");
        if (mediaNodes.length === 0) {
            return;
        }

        const cleanups: Array<() => void> = [];
        mediaNodes.forEach((mediaNode) => {
            const handleLoad = () => {
                if (shouldStickToBottomRef.current) {
                    scrollMessageListToBottom("auto");
                }
            };
            mediaNode.addEventListener("load", handleLoad, { passive: true });
            mediaNode.addEventListener("loadedmetadata", handleLoad, { passive: true });
            cleanups.push(() => {
                mediaNode.removeEventListener("load", handleLoad);
                mediaNode.removeEventListener("loadedmetadata", handleLoad);
            });
        });

        return () => {
            cleanups.forEach((cleanup) => cleanup());
        };
    }, [latestMessageSnapshot, scrollMessageListToBottom, selectedThreadId]);

    if (!user || !userProfile) {
        return null;
    }

    return (
        <div
            ref={chatViewportShellRef}
            className={CHAT_VIEWPORT_SHELL_CLASSNAME}
            style={chatViewportShellStyle}
            data-chat-shell-mode={showCompactThreadListOnly ? "list" : "thread"}
            data-platform-shell={isIosPwaChatShell ? "ios-pwa" : isAndroidPwaChatShell ? "android-pwa" : "default"}
            data-chat-shell-platform={isIosPwaChatShell ? "ios-pwa" : isAndroidPwaChatShell ? "android-pwa" : "default"}
            data-chat-bottom-nav-reserved="true"
            data-chat-composer-above-bottom-nav="true"
            data-chat-list-controls-above-bottom-nav="true"
            data-chat-density="public-beta-compact"
            data-chat-viewport-owner="internal"
            data-chat-input-focus-stable="true"
            data-chat-composer-chin="compact"
            data-chat-top-offset="navbar-aligned"
            data-chat-interaction-performance="optimized"
            data-chat-diagnostics-deferred="true"
            data-chat-tap-path="nonblocking"
        >
            <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-[0_26px_80px_rgba(0,0,0,0.55)]">
                <div className="grid h-full min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
                    {(!isCompactViewport || !selectedThreadId) ? (
                        <aside ref={compactThreadListPanelRef} className={cn(
                            "min-h-0 bg-[#050505]",
                            showCompactThreadListOnly
                                ? "relative h-full overflow-hidden"
                                : "flex min-h-0 flex-col border-b border-white/10 lg:border-b-0 lg:border-r lg:border-r-white/10",
                        )}>
                            {showCompactThreadListOnly ? (
                                <div className={CHAT_COMPACT_THREAD_LIST_PANEL_CLASSNAME}>
                                    <div className="px-5 pb-3 pt-3">
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
                                        <div className="mt-3">
                                            <p className="text-3xl font-black tracking-tight text-white">Messages</p>
                                            <p className="mt-1 text-sm text-[#8f9097]">
                                                {threadsLoading ? "Loading your conversations..." : `${visibleThreads.length} conversation${visibleThreads.length === 1 ? "" : "s"}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        ref={compactThreadListScrollRef}
                                        className={cn(CHAT_COMPACT_THREAD_LIST_SCROLL_CLASSNAME, "flex min-h-0 flex-1 flex-col")}
                                        style={compactThreadListScrollStyle}
                                    >
                                        {threadsLoading && visibleThreads.length === 0 ? (
                                            <div className="flex min-h-full flex-1 flex-col items-center justify-center text-center">
                                                <div className="rounded-full bg-[#141417] p-4 text-brand-purple ring-1 ring-white/8">
                                                    <MessageSquare className="h-8 w-8" />
                                                </div>
                                                <p className="mt-5 text-2xl font-black text-white">Loading conversations</p>
                                                <p className="mt-2 max-w-sm text-sm leading-6 text-[#8f9097]">
                                                    Pulling your creator threads into the chat shell.
                                                </p>
                                            </div>
                                        ) : filteredThreads.length > 0 ? (
                                            <div className="min-h-full space-y-1">
                                                {filteredThreads.map((thread) => (
                                                    <button
                                                        key={thread.id}
                                                        type="button"
                                                        onClick={() => openThreadFromList(thread)}
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
                                            <div className="flex min-h-full flex-1 flex-col items-center justify-center text-center">
                                                <p className="text-lg font-semibold text-white">No conversations match that search.</p>
                                                <p className="mt-2 max-w-sm text-sm leading-6 text-[#8f9097]">
                                                    Try a different name or clear the search field to see your full thread list.
                                                </p>
                                            </div>
                                        ) : canComposeFromFollowedCreators ? (
                                            <div className="flex min-h-full flex-1 flex-col items-center justify-center text-center">
                                                <div className="rounded-full bg-[#141417] p-4 text-brand-purple ring-1 ring-white/8">
                                                    <MessageSquare className="h-8 w-8" />
                                                </div>
                                                <p className="mt-5 text-2xl font-black text-white">Start a creator chat</p>
                                                <p className="mt-2 max-w-sm text-sm leading-6 text-[#8f9097]">
                                                    Pick a creator you follow and send the first message.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => openComposePicker("chat_empty_state_compose")}
                                                    className="mt-5 rounded-full bg-brand-purple px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8457ff]"
                                                >
                                                    New message
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex min-h-full flex-1 flex-col justify-center">
                                                <div className="mx-auto w-full max-w-md rounded-[1.7rem] border border-white/10 bg-[linear-gradient(160deg,rgba(31,23,52,0.96),rgba(11,11,13,0.98))] p-5 text-center shadow-[0_28px_70px_rgba(0,0,0,0.34)]">
                                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-purple/15 text-brand-purple ring-1 ring-white/8">
                                                        <MessageSquare className="h-6 w-6" />
                                                    </div>
                                                    <p className="mt-4 text-xl font-black text-white">Follow a creator first</p>
                                                    <p className="mt-2 text-sm leading-6 text-[#a9a9b1]">
                                                        Follow creators to start chatting. Follow a creator to start a private chat.
                                                    </p>
                                                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                                                        <Link
                                                            href="/experiences"
                                                            onClick={() => handleNoFollowCreatorsCtaClick("find_creators")}
                                                            className="rounded-full bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8457ff]"
                                                        >
                                                            Find creators
                                                        </Link>
                                                        <Link
                                                            href="/drops"
                                                            onClick={() => handleNoFollowCreatorsCtaClick("browse_drops")}
                                                            className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                                                        >
                                                            Browse drops
                                                        </Link>
                                                    </div>
                                                    {recommendedCreators.length > 0 ? (
                                                        <div className="mt-4 text-left">
                                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f9097]">Available creators</p>
                                                            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                                                                {recommendedCreators.slice(0, 6).map((creator) => {
                                                                    const creatorHref = buildCreatorPublicHref({
                                                                        uid: creator.uid,
                                                                        creatorId: creator.uid,
                                                                        username: creator.username,
                                                                        creatorUsername: creator.username,
                                                                    }) || "/experiences";
                                                                    return (
                                                                        <Link
                                                                            key={creator.uid}
                                                                            href={creatorHref}
                                                                            className="min-w-[9.75rem] rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-3 py-3 transition hover:bg-white/[0.08]"
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <ChatAvatar
                                                                                    photoURL={creator.photoURL}
                                                                                    label={creator.displayName}
                                                                                    sizeClassName="h-10 w-10"
                                                                                    textClassName="text-xs"
                                                                                />
                                                                                <div className="min-w-0">
                                                                                    <p className="truncate text-sm font-semibold text-white">{creator.displayName}</p>
                                                                                    <p className="truncate text-[11px] text-[#8f9097]">
                                                                                        {creator.username ? `@${creator.username}` : creator.uid}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </Link>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {threadSelectionMode ? (
                                        <div
                                            ref={compactThreadListControlsRef}
                                            className="pointer-events-none absolute inset-x-0 px-5"
                                            style={compactThreadListControlsStyle}
                                            data-chat-list-controls-above-bottom-nav="true"
                                        >
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
                                        <>
                                            <div
                                                ref={compactThreadListControlsRef}
                                                className="pointer-events-none absolute inset-x-0 px-5"
                                                style={compactThreadListControlsStyle}
                                                data-chat-list-controls-above-bottom-nav="true"
                                            >
                                                <div className={cn(
                                                    "pointer-events-auto h-12 rounded-full bg-[#121214] px-4 ring-1 ring-white/8",
                                                    canComposeFromFollowedCreators ? "mr-[4.25rem]" : "mx-auto max-w-md",
                                                )}>
                                                    <div className="flex h-full items-center gap-3">
                                                        <Search className="h-4 w-4 text-[#6e7077]" />
                                                        <input
                                                            ref={threadSearchInputRef}
                                                            value={threadSearch}
                                                            onChange={(event) => setThreadSearch(event.target.value)}
                                                            onFocus={handleThreadSearchFocus}
                                                            onBlur={(event) => {
                                                                const target = event.currentTarget;
                                                                scheduleChatPostPaintTask(releaseThreadSearchFocus);
                                                                scheduleCompactInteractionRecovery("chat_search_blur", target);
                                                            }}
                                                            onKeyDown={(event) => {
                                                                if (event.key === "Escape") {
                                                                    event.currentTarget.blur();
                                                                }
                                                            }}
                                                            placeholder="Search"
                                                            className="w-full bg-transparent text-base leading-5 text-white placeholder:text-[#6e7077] focus:outline-none sm:text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            {canComposeFromFollowedCreators ? (
                                                <button
                                                    ref={compactThreadListFloatingActionRef}
                                                    type="button"
                                                    onClick={() => openComposePicker("chat_list_floating_compose")}
                                                    className="pointer-events-auto absolute right-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-purple text-white shadow-[0_18px_36px_rgba(111,63,244,0.34)] transition hover:bg-[#8457ff]"
                                                    style={compactThreadListFloatingActionStyle}
                                                    aria-label="Compose message"
                                                    data-chat-list-controls-above-bottom-nav="true"
                                                >
                                                    <SquarePen className="h-5 w-5" />
                                                </button>
                                            ) : null}
                                        </>
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
                                                onClick={() => openThreadFromList(thread)}
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
                        <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#000000]" style={chatThreadSectionStyle}>
                        {selectedThread ? (
                            <>
                                <div className="border-b border-white/10 px-4 pb-3 pt-4 sm:px-6">
                                    <div className={cn("relative flex items-center justify-center")}>
                                        {isCompactViewport ? (
                                            <button
                                                type="button"
                                                onClick={returnToThreadList}
                                                className="absolute left-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#161618] text-white transition hover:bg-[#202024]"
                                                aria-label="Back to chat list"
                                            >
                                                <ArrowLeft className="h-[18px] w-[18px]" />
                                            </button>
                                        ) : null}
                                        {selectedThreadCreatorProfileHref ? (
                                            <Link
                                                href={selectedThreadCreatorProfileHref}
                                                onClick={() => {
                                                    trackEvent("creator_profile_link_clicked", buildCreatorProfileLinkTelemetryPayload({
                                                        actor: chatProfileLinkActor,
                                                        creator: selectedThreadCreatorRouteInput,
                                                        href: selectedThreadCreatorProfileHref,
                                                        routeSource: "chat_header",
                                                        currentRoute: "/dashboard/chat",
                                                    }));
                                                }}
                                                className="flex items-center gap-2.5 rounded-full bg-[#141417] px-2 py-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.3)] ring-1 ring-white/8 transition active:scale-[0.98] active:opacity-75"
                                            >
                                                <ChatAvatar
                                                    photoURL={selectedThread.counterpartPhotoURL}
                                                    label={selectedThread.counterpartDisplayName}
                                                    sizeClassName="h-8 w-8"
                                                    textClassName="text-[11px]"
                                                />
                                                <div className="min-w-0 pr-2">
                                                    <p className="truncate text-xs font-semibold text-white">{selectedThread.counterpartDisplayName}</p>
                                                    <p className="truncate text-[10px] text-[#8f9097]">@{selectedThread.counterpartUsername}</p>
                                                </div>
                                            </Link>
                                        ) : (
                                            <div className="flex items-center gap-2.5 rounded-full bg-[#141417] px-2 py-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.3)] ring-1 ring-white/8">
                                                <ChatAvatar
                                                    photoURL={selectedThread.counterpartPhotoURL}
                                                    label={selectedThread.counterpartDisplayName}
                                                    sizeClassName="h-8 w-8"
                                                    textClassName="text-[11px]"
                                                />
                                                <div className="min-w-0 pr-2">
                                                    <p className="truncate text-xs font-semibold text-white">{selectedThread.counterpartDisplayName}</p>
                                                    <p className="truncate text-[10px] text-[#8f9097]">Direct chat</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div
                                    ref={messageListRef}
                                    onScroll={handleMessageListScroll}
                                    className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-black px-4 pt-4 sm:px-6"
                                    style={chatTranscriptStyle}
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
                                        const isAttachmentOnlyMessage = Boolean(message.assetUrl && !message.text?.trim());
                                        const readState = isOptimistic
                                            ? "Sending..."
                                            : isLatestOutgoing && selectedThread.counterpartReadAt >= message.createdAt
                                                ? "Read"
                                                : "Sent";

                                        return (
                                            <div key={message.id} className={cn(index === 0 ? "" : "mt-1")}>
                                                {showTimelineMarker ? (
                                                    <div className="mb-4 flex justify-center">
                                                        <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#6b6c73]">
                                                            {formatTimelineLabel(message.createdAt)}
                                                        </span>
                                                    </div>
                                                ) : null}
                                                <div className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}>
                                                    <div
                                                        className={cn(
                                                            "min-w-0",
                                                            isAttachmentOnlyMessage
                                                                ? "w-fit max-w-[78vw] sm:max-w-[28rem]"
                                                                : message.assetUrl
                                                                    ? "max-w-[65%]"
                                                                    : "max-w-[84%] sm:max-w-[72%]",
                                                        )}
                                                        data-chat-media-density="compact-v2"
                                                    >
                                                        <div className={cn(
                                                            "overflow-hidden text-[15px] leading-6 shadow-[0_12px_30px_rgba(0,0,0,0.22)]",
                                                            isOutgoing
                                                                ? "rounded-[1.45rem] rounded-br-[0.5rem] bg-[linear-gradient(135deg,rgba(178,140,255,.96),rgba(126,87,255,.94))] text-white"
                                                                : "rounded-[1.45rem] rounded-bl-[0.5rem] bg-[#26262a] text-white",
                                                            isAttachmentOnlyMessage ? "inline-block p-1.5" : "px-4 py-2.5",
                                                            isOptimistic ? "opacity-75" : "",
                                                        )}>
                                                            {message.text ? <p className="whitespace-pre-wrap break-words">{message.text}</p> : null}
                                                            {message.assetUrl ? (
                                                                <div className={cn(message.text ? "mt-3" : "")}>
                                                                    <div className={cn(
                                                                        "w-fit max-w-full overflow-hidden rounded-[1.15rem]",
                                                                        isOutgoing ? "bg-[#5b2fdd]" : "bg-[#1a1a1d]",
                                                                    )} style={CHAT_MEDIA_PREVIEW_STYLE}>
                                                                        {isImageAttachment(message.assetMimeType, message.assetUrl) ? (
                                                                            // eslint-disable-next-line @next/next/no-img-element
                                                                            <img src={message.assetUrl} alt="" className="h-auto w-auto max-w-full object-contain" style={CHAT_MEDIA_PREVIEW_STYLE} data-chat-media-kind="image" />
                                                                        ) : isVideoAttachment(message.assetMimeType, message.assetUrl) ? (
                                                                            <video src={message.assetUrl} controls className="h-auto w-auto max-w-full object-contain" style={CHAT_MEDIA_PREVIEW_STYLE} data-chat-media-kind="video" />
                                                                        ) : (
                                                                            <a
                                                                                href={getSafeExternalUrl(message.assetUrl) || "#"}
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
                                            <div className="w-full max-w-md rounded-[1.4rem] bg-[#121214] px-4 py-4 text-sm text-[#b6b6bc] ring-1 ring-white/8">
                                                <p className="text-base font-semibold text-white">Say hey to {selectedThreadCreatorFirstName}</p>
                                                <p className="mt-1 leading-6 text-[#8f9097]">Start simple or use a quick ice breaker.</p>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {buildChatIceBreakers(selectedThreadCreatorFirstName).map((iceBreaker) => (
                                                        <button
                                                            key={iceBreaker}
                                                            type="button"
                                                            onClick={() => handleIceBreakerInsert(iceBreaker)}
                                                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
                                                        >
                                                            {iceBreaker}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div
                                    ref={chatThreadComposerRef}
                                    className="shrink-0 min-w-0 border-t border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.92)_18%,#000_100%)] px-4 pb-2 pt-1.5 sm:px-6 sm:pb-4"
                                    style={chatThreadComposerStyle}
                                    data-chat-composer-above-bottom-nav="true"
                                    data-chat-density="public-beta-compact"
                                    data-chat-composer-chin="compact"
                                >
                                    {(hasFullComposerTray || hasSummaryOnlyComposerTray) ? (
                                        <div className={cn("mb-2.5 space-y-2", CHAT_COMPOSER_STATUS_TRAY_MAX_HEIGHT_CLASSNAME)}>
                                            {sendErrorMessage ? (
                                                <div className="rounded-[1.2rem] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
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
                                                <div className="rounded-[1.2rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
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
                                            {proactivePaidGdGateVisible ? (
                                                <ChatPaidGdGuidanceCard
                                                    creatorFirstName={selectedThreadCreatorFirstName}
                                                    gate={proactivePaidGdGate}
                                                    payload={null}
                                                    mode="proactive"
                                                    onPurchase={() => openChatPaidGdPurchaseModal("chat_paid_gd_guidance_card")}
                                                    onBrowseDrops={() => goUnwrapDropsForChat("chat_paid_gd_guidance_card")}
                                                />
                                            ) : insufficientFunds ? (
                                                <ChatPaidGdGuidanceCard
                                                    creatorFirstName={selectedThreadCreatorFirstName}
                                                    gate={proactivePaidGdGate}
                                                    payload={insufficientFunds}
                                                    mode="reactive"
                                                    onClose={() => setInsufficientFunds(null)}
                                                    onPurchase={() => openChatPaidGdPurchaseModal("chat_paid_gd_failure_card")}
                                                    onBrowseDrops={() => goUnwrapDropsForChat("chat_paid_gd_failure_card")}
                                                />
                                            ) : null}
                                            {composerFile ? (
                                                <div className="flex items-center justify-between rounded-[1.1rem] bg-[#121214] px-4 py-3 text-sm text-white ring-1 ring-white/8">
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
                                                <div className="truncate text-[13px] leading-[18px] text-[#7f8087]">{composerSummary}</div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                    <div ref={chatThreadComposerControlRef} className={cn("flex min-w-0 items-center gap-2", isIosPwaChatShell ? "h-9 max-h-9" : "h-12 max-h-12")}>
                                        <div ref={attachmentMenuRef} className="relative shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setAttachmentMenuOpen((current) => !current)}
                                                disabled={composerBlockedByPaidGdGate}
                                                className={cn(
                                                    isIosPwaChatShell
                                                        ? "inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#141417] text-white transition hover:bg-[#1a1b1f]"
                                                        : "inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#141417] text-white transition hover:bg-[#1a1b1f]",
                                                    composerBlockedByPaidGdGate ? "cursor-not-allowed opacity-45 hover:bg-[#141417]" : "",
                                                )}
                                                aria-label="Add attachment"
                                                aria-expanded={attachmentMenuOpen}
                                                aria-haspopup="menu"
                                            >
                                                <Plus className="h-5 w-5" />
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
                                                        className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-2 text-left text-xs font-medium text-white transition hover:bg-white/5"
                                                    >
                                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple/18 text-brand-purple">
                                                            <ImageIcon className="h-4 w-4" />
                                                        </span>
                                                        <span>Image</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={openVideoPicker}
                                                        className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-2 text-left text-xs font-medium text-white transition hover:bg-white/5"
                                                    >
                                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white">
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
                                        <div className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-[1.65rem] bg-[#121214] ring-1 ring-white/8", isIosPwaChatShell ? "h-9 max-h-9 py-0.5 pl-3 pr-0.5" : "h-12 max-h-12 py-1 pl-4 pr-1")}>
                                            <textarea
                                                value={composerText}
                                                onChange={(event) => handleComposerTextChange(event.target.value.slice(0, 1200))}
                                                onBlur={() => pushTypingState(false, "blur")}
                                                onKeyDown={handleComposerKeyDown}
                                                rows={1}
                                                disabled={composerBlockedByPaidGdGate}
                                                placeholder={composerBlockedByPaidGdGate ? "Paid GumDrops required for creator messaging" : selectedThread.viewerRole === "creator" ? "Reply..." : "Message"}
                                                className={cn(
                                                    "block w-full resize-none self-center overflow-y-auto bg-transparent py-0 text-white placeholder:text-[#5d5e66] focus:outline-none",
                                                    isIosPwaChatShell ? "max-h-5 min-h-[20px] text-[12px] leading-5" : "max-h-6 min-h-[24px] text-[16px] leading-6 sm:text-[14px]",
                                                )}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => void handleSendMessage()}
                                                disabled={sendingMessage || composerBlockedByPaidGdGate}
                                                className={cn(
                                                    isIosPwaChatShell
                                                        ? "inline-flex h-9 w-9 shrink-0 self-center items-center justify-center rounded-full transition"
                                                        : "inline-flex h-12 w-12 shrink-0 self-center items-center justify-center rounded-full transition",
                                                    sendingMessage || composerBlockedByPaidGdGate
                                                        ? "cursor-not-allowed bg-brand-purple/50 text-white/80"
                                                        : "bg-brand-purple text-white hover:bg-[#8457ff]",
                                                )}
                                                aria-label="Send message"
                                            >
                                                {sendingMessage ? (
                                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                ) : (
                                                    <Send className="h-[18px] w-[18px] ml-0.5" />
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
                <div
                    className="fixed inset-0 z-40 bg-black/72 px-4 pt-6 backdrop-blur-[2px]"
                    data-chat-new-message-modal="true"
                    data-chat-modal-above-bottom-nav="true"
                    data-chat-modal-glass-skin="true"
                    data-chat-functions-unchanged="true"
                    data-new-message-sheet-platform={isIosPwaChatShell ? "ios-pwa" : "default"}
                    data-new-message-sheet-safe="above-bottom-nav"
                >
                    <div ref={composePickerRef} className="mx-auto flex h-full w-full max-w-md flex-col justify-end" style={newMessageSheetStyle}>
                        <div className="overflow-hidden rounded-[2rem] border border-white/12 bg-black/88 shadow-[0_32px_90px_rgba(0,0,0,0.68)] backdrop-blur-2xl supports-[backdrop-filter]:bg-black/78">
                            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-4">
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
                            <div
                                className={cn("overflow-y-auto px-3 pt-3 overscroll-contain", isIosPwaChatShell ? "max-h-[52vh]" : "max-h-[56vh]")}
                                style={newMessageListStyle}
                                data-chat-modal-list-bottom-padding="true"
                            >
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

