"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
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
import { useAuthIdentity } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/telemetry";

interface NotificationNote {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt?: { toDate: () => Date };
  link?: string;
  dropContext?: {
    previewImageUrl?: string;
    dropTitle?: string;
  };
}

function getTypePill(type: string) {
  switch (type) {
    case "success":
      return {
        label: "Ready",
        icon: CheckCircle,
        className: "bg-brand-purple/20 text-white border-brand-purple/30",
      };
    case "warning":
      return {
        label: "Heads up",
        icon: TriangleAlert,
        className: "bg-white/10 text-white border-white/15",
      };
    case "error":
      return {
        label: "Issue",
        icon: XCircle,
        className: "bg-red-500/15 text-red-100 border-red-500/30",
      };
    default:
      return {
        label: "Info",
        icon: Info,
        className: "bg-white/10 text-white border-white/15",
      };
  }
}

function NotificationThumbnail({ note }: { note: NotificationNote }) {
  if (note.dropContext?.previewImageUrl) {
    return (
      <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-black/50">
        <Image
          src={note.dropContext.previewImageUrl}
          alt={note.dropContext.dropTitle || note.title}
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
    );
  }

  const pill = getTypePill(note.type);
  const Icon = pill.icon;
  const fallbackLetter = (note.title.trim()[0] || "K").toUpperCase();

  return (
    <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(178,140,255,0.45),rgba(20,20,24,0.95)_72%)]">
      <span className="text-2xl font-black text-white/90">{fallbackLetter}</span>
      <div className="absolute bottom-1.5 right-1.5 rounded-full border border-white/15 bg-black/55 p-1 text-brand-purple">
        <Icon className="h-3 w-3" />
      </div>
    </div>
  );
}

function NotificationItem({
  note,
  markAsRead,
  closeDropdown,
}: {
  note: NotificationNote;
  markAsRead: (id: string) => Promise<boolean>;
  closeDropdown: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const pill = getTypePill(note.type);
  const PillIcon = pill.icon;

  const openDrop = async () => {
    if (isPending) {
      return;
    }

    setIsPending(true);
    try {
      const destination = note.link || "/drops";
      trackEvent("notification_opened", {
        source: "notifications_dropdown",
        destination,
        notification_id: note.id,
      });
      await markAsRead(note.id);
      router.push(destination);
      closeDropdown();
    } finally {
      setIsPending(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (isPending) {
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

  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-3 shadow-lg shadow-black/20 transition-colors hover:bg-white/[0.06]">
      <div className="flex gap-3">
        <NotificationThumbnail note={note} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{note.title}</p>
              <p className="mt-1 text-[11px] text-gray-500">
                {note.createdAt?.toDate ? formatDistanceToNow(note.createdAt.toDate(), { addSuffix: true }) : "Just now"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void handleMarkAsRead();
              }}
              disabled={isPending}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-brand-purple/30 bg-brand-purple/15 px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-purple/25"
              title="Mark as read"
            >
              <Check className="h-3 w-3" />
              Read
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]", pill.className)}>
              <PillIcon className="h-3 w-3" />
              {pill.label}
            </span>
            {note.dropContext?.dropTitle ? (
              <span className="truncate text-[11px] font-medium text-gray-300">{note.dropContext.dropTitle}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/10"
        >
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {isExpanded ? "Collapse" : "Expand"}
        </button>

        {note.dropContext || note.link ? (
          <button
            type="button"
            onClick={() => {
              void openDrop();
            }}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/30 bg-brand-purple px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {note.dropContext ? "Open drop" : "Open"}
          </button>
        ) : null}
      </div>

      {isExpanded ? (
        <div className="mt-3 rounded-2xl border border-white/8 bg-black/30 p-3">
          <p className="text-xs leading-6 text-gray-300">{note.message}</p>
        </div>
      ) : null}
    </div>
  );
}

export function NotificationBell() {
  const { user } = useAuthIdentity();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleOpenRequest() {
      setIsOpen(true);
      trackEvent("notifications_dropdown_opened", {
        unread_count: unreadCount,
        source: "task_cta",
      });
    }

    window.addEventListener("kandydrops:open-notifications", handleOpenRequest);
    return () => window.removeEventListener("kandydrops:open-notifications", handleOpenRequest);
  }, [unreadCount]);

  const toggleDropdown = () => {
    setIsOpen((current) => {
      const next = !current;
      if (next) {
        trackEvent("notifications_dropdown_opened", {
          unread_count: unreadCount,
          source: "notification_bell",
        });
      }
      return next;
    });
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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        data-onboarding-target="notification-bell"
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-gray-300 transition-colors hover:bg-black/40 hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border border-white/20 bg-brand-purple px-1 text-[10px] font-black text-white shadow-lg">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      <div
        className={cn(
          "absolute -right-1 top-full z-50 mt-3 flex max-h-[28rem] w-[min(21rem,calc(100vw-0.75rem))] origin-top-right flex-col overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/95 shadow-2xl shadow-black/70 transition-all duration-200 sm:right-0 sm:w-80",
          isOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-2 scale-95 opacity-0",
        )}
        style={{ WebkitBackdropFilter: "blur(30px)", backdropFilter: "blur(30px)" }}
      >
        <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              <p className="mt-1 text-[11px] text-gray-500">
                {unreadCount > 0 ? `${unreadCount} unread updates` : "You are all caught up"}
              </p>
            </div>

            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  void handleMarkAllAsRead();
                }}
                disabled={isClearingAll}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-brand-purple/30 bg-brand-purple/15 px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-purple/25"
              >
                <Sparkles className="h-3 w-3" />
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-2 custom-scrollbar">
          {!user || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-brand-purple">
                <Bell className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">No notifications yet</p>
              <p className="mt-1 text-xs leading-6 text-gray-500">
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
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
