"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Dialog, DialogTrigger, DialogPrimitiveContent, DialogTitle, DialogDescription,
} from "@/components/creative-tim/ui/dialog";
import { Button } from "@/components/ui/Button";
import {
  Bell,
  Check,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  Info,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useNotifications } from "@/hooks/useNotifications";
import { CLIENT_RUNTIME_EVENTS, dispatchClientRuntimeEvent } from "@/hooks/client-runtime";
import { useAuthIdentity } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { USER_NAVIGATION_PANEL_MAX_HEIGHT } from "@/lib/user-mobile-shell";
import { trackEvent } from "@/lib/telemetry";
import { useDeferredClientReady } from "@/hooks/useDeferredClientReady";
import { useNetworkConditions } from "@/hooks/useNetworkConditions";
import { getNotificationProblemCopy } from "@/lib/problem-state-copy";

interface NotificationNote {
  id: string;
  title: string;
  message: string;
  type: string;
  readBy: string[];
  createdAt?: { toDate: () => Date } | null;
  link?: string;
  dropContext?: {
    previewImageUrl?: string;
    dropTitle?: string;
  };
}

function getNotificationPanelStyle(): CSSProperties {
  return {
    width: "min(22rem, calc(100vw - max(1rem, env(safe-area-inset-left)) - max(1rem, env(safe-area-inset-right))))",
    maxHeight: USER_NAVIGATION_PANEL_MAX_HEIGHT,
  };
}

function getNotificationType(type: string) {
  switch (type) {
    case "success":
      return {
        label: "Ready",
        icon: CheckCircle,
      };
    case "warning":
      return {
        label: "Heads up",
        icon: TriangleAlert,
      };
    case "error":
      return {
        label: "Issue",
        icon: XCircle,
      };
    default:
      return {
        label: "Info",
        icon: Info,
      };
  }
}

function normalizeNotificationText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function extractMessageSubject(message: string) {
  const normalized = normalizeNotificationText(message);
  if (!normalized) {
    return "";
  }

  const firstSentence = normalized.split(/(?<=[.!?])\s+/u)[0] ?? normalized;
  return firstSentence.replace(/[.!?]+$/u, "").slice(0, 72).trim();
}

function isTaskRelatedNotification(note: NotificationNote) {
  return note.link?.includes("/experiences") || /task|reward|deadline|check-in/i.test(`${note.title} ${note.message}`);
}

function getTaskSubject(note: NotificationNote) {
  const combinedText = `${note.title} ${note.message}`;
  if (/check-?in/i.test(combinedText)) {
    return "Daily check-in";
  }
  if (/deadline|before midnight|expires/i.test(combinedText)) {
    return "Daily task deadline";
  }
  if (/reward/i.test(combinedText)) {
    return "Task reward";
  }
  if (/reminder/i.test(combinedText)) {
    return "Task reminder";
  }

  return "Task update";
}

function getNotificationSubject(note: NotificationNote) {
  if (note.dropContext?.dropTitle) {
    return note.dropContext.dropTitle;
  }

  const messageSubject = extractMessageSubject(note.message);
  if (isTaskRelatedNotification(note)) {
    return messageSubject || getTaskSubject(note);
  }

  if (note.link?.includes("/dashboard/profile")) {
    return "Profile settings";
  }

  if (note.link?.includes("/drops")) {
    return "Drop library";
  }

  return messageSubject;
}

function getNotificationDetails(note: NotificationNote, subject: string) {
  const normalized = normalizeNotificationText(note.message);
  if (!normalized) {
    return "";
  }

  if (!subject) {
    return normalized;
  }

  if (normalized.toLowerCase() === subject.toLowerCase()) {
    return "";
  }

  if (normalized.toLowerCase().startsWith(subject.toLowerCase())) {
    const remainder = normalized.slice(subject.length).replace(/^[:\-.,!\s]+/u, "").trim();
    if (remainder) {
      return remainder;
    }
  }

  const firstSentence = extractMessageSubject(note.message);
  if (firstSentence && firstSentence.toLowerCase() === subject.toLowerCase()) {
    const remainder = normalized.slice(firstSentence.length).replace(/^[:\-.,!\s]+/u, "").trim();
    if (remainder) {
      return remainder;
    }
  }

  return normalized;
}

function getNotificationActionLabel(note: NotificationNote) {
  if (note.link?.includes("/experiences")) {
    return "Open tasks";
  }

  if (note.dropContext) {
    return "Open drop";
  }

  return "Open";
}

function formatNotificationTimestamp(note: NotificationNote) {
  if (!note.createdAt?.toDate) {
    return "Delivery time unavailable";
  }

  return note.createdAt.toDate().toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function NotificationThumbnail({ note }: { note: NotificationNote }) {
  if (note.dropContext?.previewImageUrl) {
    return (
      <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-border bg-card">
        <Image
          src={note.dropContext.previewImageUrl}
          alt={note.dropContext.dropTitle || note.title}
          fill
          sizes="48px"
          className="object-cover"
        />
      </div>
    );
  }

  if (isTaskRelatedNotification(note)) {
    return (
      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary text-primary">
        <TriangleAlert className="h-4.5 w-4.5" />
      </div>
    );
  }

  const Icon = getNotificationType(note.type).icon;
  const fallbackLetter = (note.title.trim()[0] || "K").toUpperCase();

  return (
    <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary">
      <span className="text-lg font-semibold text-foreground">{fallbackLetter}</span>
      <div className="absolute bottom-1 right-1 rounded-full border border-border bg-popover p-1 text-primary">
        <Icon className="h-2.5 w-2.5" />
      </div>
    </div>
  );
}

function NotificationItem({
  note,
  markAsRead,
  closeDropdown,
  currentUserId,
}: {
  note: NotificationNote;
  markAsRead: (id: string, options?: { preserveVisible?: boolean }) => Promise<boolean>;
  closeDropdown: () => void;
  currentUserId: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const subject = getNotificationSubject(note);
  const details = getNotificationDetails(note, subject);
  const expandable = details.length > 0;
  const isRead = Boolean(currentUserId && note.readBy.includes(currentUserId));
  const relativeTime = note.createdAt?.toDate
    ? formatDistanceToNow(note.createdAt.toDate(), { addSuffix: true })
    : null;
  const deliveredAt = formatNotificationTimestamp(note);
  const autoMarkedReadRef = useRef(false);

  const markViewedAsRead = async () => {
    if (autoMarkedReadRef.current || isRead) {
      return;
    }

    autoMarkedReadRef.current = true;
    await markAsRead(note.id, { preserveVisible: true });
  };

  const openNotification = async () => {
    if (isPending) {
      return;
    }

    setIsPending(true);
    try {
      const destination = note.link || "/drops";
      trackEvent("notification_action_clicked", {
        source: "notifications_dropdown",
        source_component: "notification_bell",
        destination,
        notification_id: note.id,
        idempotency_key: `${note.id}:open`,
        notification_type: note.type,
        recipient_id: currentUserId ?? "",
        actor_user_id: currentUserId ?? "",
        target_user_id: currentUserId ?? "",
        entity_type: "notification",
        entity_id: note.id,
        surface: "notifications_dropdown",
      });
      trackEvent("notification_opened", {
        source: "notifications_dropdown",
        source_component: "notification_bell",
        destination,
        notification_id: note.id,
        idempotency_key: note.id,
        notification_type: note.type,
        recipient_id: currentUserId ?? "",
        actor_user_id: currentUserId ?? "",
        target_user_id: currentUserId ?? "",
        surface: "notifications_dropdown",
      });
      await markAsRead(note.id, { preserveVisible: true });
      router.push(destination);
      closeDropdown();
    } finally {
      setIsPending(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (isPending || isRead) {
      return;
    }

    setIsPending(true);
    try {
      const success = await markAsRead(note.id);
      if (!success) {
        toast.error("We couldn't mark that notification as read. Please try again.");
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleToggleExpanded = () => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);

    if (nextExpanded && !isPending) {
      void markViewedAsRead();
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-2 shadow-sm transition-colors hover:bg-secondary">
      <div className="flex gap-2">
        <NotificationThumbnail note={note} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  KandyDrops · {getNotificationType(note.type).label}
                </span>
              </div>
              <p className="mt-0.5 text-sm font-semibold leading-5 text-foreground">{note.title}</p>
              {isExpanded && subject ? (
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {subject}
                </p>
              ) : null}
              {isExpanded && details ? (
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                  {details}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="text-right text-xs font-medium text-muted-foreground">
                {deliveredAt}
              </span>
              {relativeTime ? (
                <span className="text-xs text-muted-foreground">{relativeTime}</span>
              ) : null}
              <Button variant="ghost" size="sm"
                type="button"
                aria-label={isRead ? "Already read" : "Mark as read"}
                onClick={() => {
                  void handleMarkAsRead();
                }}
                disabled={isPending || isRead}
                className="gap-1 text-xs"
                title="Mark as read"
              >
                <Check className="h-3 w-3" />
                {isRead ? "Viewed" : "Read"}
              </Button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {(note.dropContext || note.link) ? (
              <Button variant="brand" size="sm"
                type="button"
                aria-label="Open details"
                onClick={() => {
                  void openNotification();
                }}
                disabled={isPending}
                className="gap-1.5 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {getNotificationActionLabel(note)}
              </Button>
            ) : null}

            {expandable ? (
              <Button variant="ghost" size="sm"
                type="button"
                aria-expanded={isExpanded}
                onClick={handleToggleExpanded}
                className="gap-1.5 text-xs"
              >
                <ChevronDown aria-hidden="true" className={cn("h-3.5 w-3.5 transition-transform", isExpanded ? "rotate-180" : "")} />
                {isExpanded ? "Less" : "Details"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const { user } = useAuthIdentity();
  const [isOpen, setIsOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const { isConstrained, isVerySlow } = useNetworkConditions();
  const warmReady = useDeferredClientReady({
    delayMs: isVerySlow ? 1_500 : isConstrained ? 900 : 450,
    idle: true,
  });
  const notificationsEnabled = Boolean(user) && (isOpen || warmReady);
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead } = useNotifications({
    enabled: notificationsEnabled,
  });
  const notificationProblem = error ? getNotificationProblemCopy(error) : null;
  const panelStyle = getNotificationPanelStyle();

  useEffect(() => {
    function handleOpenRequest() {
      setIsOpen(true);
      trackEvent("notifications_dropdown_opened", {
        unread_count: unreadCount,
        source: "task_cta",
        source_component: "notification_bell",
      });
    }

    window.addEventListener(CLIENT_RUNTIME_EVENTS.openNotifications, handleOpenRequest);
    return () => window.removeEventListener(CLIENT_RUNTIME_EVENTS.openNotifications, handleOpenRequest);
  }, [unreadCount]);

  const handleOpenChange = (next: boolean) => {
    if (next && !isOpen) {
      trackEvent("notifications_dropdown_opened", {
        unread_count: unreadCount,
        source: "notification_bell",
        source_component: "notification_bell",
      });
    }
    setIsOpen(next);
  };

  const handleMarkAllAsRead = async () => {
    if (isClearingAll) {
      return;
    }

    setIsClearingAll(true);
    try {
      const result = await markAllAsRead();
      if (result.failedCount > 0) {
        toast.error("Some notifications could not be cleared. Please try again.");
      }
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={false}>
    <div className="static md:relative">
      <DialogTrigger asChild>
      <Button variant="ghost" size="icon"
        aria-expanded={isOpen}
        type="button"
        data-onboarding-target="notification-bell"
        aria-label="Notifications"
        title="View notifications"
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border border-border bg-primary px-1 text-xs font-semibold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>
      </DialogTrigger>

      <DialogPrimitiveContent
        className={cn(
          "absolute right-[max(1rem,env(safe-area-inset-right))] top-full z-50 mt-3 flex flex-col md:right-0 overflow-hidden rounded-2xl border border-border bg-popover text-foreground shadow-lg",
        )}
        style={panelStyle}
      >
        <div className="border-b border-border bg-card px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Inbox</p>
              <DialogTitle asChild><h3 className="mt-1 text-base font-semibold text-foreground">Notifications</h3></DialogTitle>
              <DialogDescription asChild><p className="mt-1 text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread updates` : "You are all caught up"}
              </p></DialogDescription>
            </div>

            {unreadCount > 0 ? (
              <Button variant="ghost" size="sm"
                type="button"
                aria-label="Clear all notifications"
                title="Clear all notifications"
                onClick={() => {
                  void handleMarkAllAsRead();
                }}
                disabled={isClearingAll}
                className="gap-1 text-xs"
              >
                <Sparkles className="h-3 w-3" />
                Clear all
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-2.5 custom-scrollbar">
          {!user ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-secondary text-primary">
                <Bell className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">No notifications yet</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                We will drop updates here when something new is ready to unwrap.
              </p>
            </div>
          ) : loading ? (
            <div className="space-y-2 px-1 py-2">
              {[0, 1, 2].map((index) => (
                <div key={index} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-xl bg-secondary" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3.5 w-24 rounded-full bg-secondary" />
                      <div className="h-4 w-3/4 rounded-full bg-secondary" />
                      <div className="h-3 w-1/2 rounded-full bg-secondary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : notificationProblem ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-secondary text-primary">
                <TriangleAlert className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">{notificationProblem.headline}</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">{notificationProblem.body}</p>
              <Button variant="ghost" size="sm"
                type="button"
                onClick={() => dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.notificationsSync, true)}
                className="mt-4 text-xs"
              >
                {notificationProblem.actionLabel}
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-secondary text-primary">
                <Bell className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">No notifications yet</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                We will drop updates here when something new is ready to unwrap.
              </p>
            </div>
          ) : (
            notifications.map((note) => (
              <NotificationItem
                key={note.id}
                note={note as NotificationNote}
                markAsRead={markAsRead}
                closeDropdown={() => setIsOpen(false)}
                currentUserId={user?.uid ?? null}
              />
            ))
          )}
        </div>
      </DialogPrimitiveContent>
    </div>
    </Dialog>
  );
}
