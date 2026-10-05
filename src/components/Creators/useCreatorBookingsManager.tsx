"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSubmitBugReport } from "@/hooks/useSubmitBugReport";
import { authFetch } from "@/lib/authFetch";
import { resolveClientActionError, type ResolvedClientActionError } from "@/lib/errors/client-error-adapter";

type SectionState = "live" | "unavailable" | "not_configured" | "blocked" | "needs_setup" | "needs_review" | "error";
type BookingStatus = "booked" | "upcoming" | "in_progress" | "completed" | "canceled" | string;
type BookingAction = "complete" | "cancel";

type CreatorBookingRow = {
  id: string;
  userId?: string;
  serviceType?: "phone" | "video" | string;
  status?: BookingStatus;
  startAt?: number;
  endAt?: number;
  durationMinutes?: number;
  priceGd?: number;
};

type CreatorBookingsResponse = {
  success?: boolean;
  bookings?: CreatorBookingRow[];
  error?: string;
  message?: string;
  status?: BookingStatus;
};

export type CreatorBookingsManagerProps = {
  creatorId: string;
  creatorName: string;
  enabled: boolean;
  restricted: boolean;
  readOnly: boolean;
  sourceState: SectionState;
  availabilityConfigured: boolean;
};

export function statusTone(status: BookingStatus | undefined) {
  switch (status) {
    case "booked":
    case "upcoming":
    case "in_progress":
      return "border-info/20 bg-info/10 text-info";
    case "completed":
      return "border-success/20 bg-success/10 text-success";
    case "canceled":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-secondary text-foreground";
  }
}

export function formatCount(count: number) {
  return `${count.toLocaleString()} booking${count === 1 ? "" : "s"}`;
}

export function formatDate(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Time unavailable";
  }
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeBookings(value: unknown): CreatorBookingRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is CreatorBookingRow => Boolean(entry && typeof entry === "object" && typeof (entry as CreatorBookingRow).id === "string"))
    .sort((left, right) => {
      const leftAt = typeof left.startAt === "number" ? left.startAt : 0;
      const rightAt = typeof right.startAt === "number" ? right.startAt : 0;
      return leftAt - rightAt;
    });
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function useCreatorBookingsManager({
  creatorId,
  creatorName,
  enabled,
  restricted,
  readOnly,
  sourceState,
  availabilityConfigured,
}: CreatorBookingsManagerProps) {
const [bookings, setBookings] = useState<CreatorBookingRow[]>([]);
const [loading, setLoading] = useState(false);
const [actionError, setActionError] = useState<ResolvedClientActionError | null>(null);
const [pendingActionId, setPendingActionId] = useState<string | null>(null);
const bugReporter = useSubmitBugReport();
const loadRequestIdRef = useRef(0);
const pendingActionIdRef = useRef<string | null>(null);
const canLoadBookings = Boolean(creatorId && enabled && !restricted);
const bookingsUrl = useMemo(() => `/api/creator/bookings?creatorId=${encodeURIComponent(creatorId)}`, [creatorId]);
const managementState = restricted
    ? "blocked"
    : enabled && availabilityConfigured
      ? "connected"
      : enabled
        ? "configuration_only"
        : "not_configured";
const loadBookings = useCallback(async () => {
    if (!canLoadBookings) {
      setBookings([]);
      setActionError(null);
      setLoading(false);
      return;
    }

    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    setActionError(null);
    try {
      const response = await authFetch(bookingsUrl);
      const body = await response.json().catch(() => ({})) as CreatorBookingsResponse;
      if (!response.ok) {
        throw resolveClientActionError(body, {
          code: "manager_load_failed",
          status: response.status,
          surface: "creator_dashboard",
          route: bookingsUrl,
          fallbackKey: "manager_load_failed",
          context: { manager: "bookings", stage: "load" },
        });
      }
      if (loadRequestIdRef.current === requestId) {
        setBookings(normalizeBookings(body.bookings));
      }
    } catch (loadError) {
      if (loadRequestIdRef.current === requestId) {
        setActionError("descriptor" in readObject(loadError)
          ? loadError as ResolvedClientActionError
          : resolveClientActionError(loadError, {
            surface: "creator_dashboard",
            route: bookingsUrl,
            fallbackKey: "manager_load_failed",
            context: { manager: "bookings", stage: "load" },
          }));
        setBookings([]);
      }
    } finally {
      if (loadRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [bookingsUrl, canLoadBookings]);
useEffect(() => {
    void loadBookings();
  }, [loadBookings]);
async function handleAction(booking: CreatorBookingRow, action: BookingAction) {
    if (!booking.id || readOnly || restricted || !enabled || !availabilityConfigured || pendingActionIdRef.current) {
      return;
    }

    const actionKey = `${booking.id}:${action}`;
    pendingActionIdRef.current = actionKey;
    setPendingActionId(actionKey);
    setActionError(null);
    try {
      const response = await authFetch("/api/creator/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, action }),
      });
      const body = await response.json().catch(() => ({})) as CreatorBookingsResponse;
      if (!response.ok) {
        throw resolveClientActionError(body, {
          code: "mutation_failed",
          status: response.status,
          surface: "creator_dashboard",
          route: "/api/creator/bookings",
          fallbackKey: "mutation_failed",
          context: { manager: "bookings", stage: "mutation", action, bookingId: booking.id },
        });
      }

      const nextStatus = body.status || (action === "complete" ? "completed" : "canceled");
      setBookings((current) => current.map((entry) => entry.id === booking.id ? { ...entry, status: nextStatus } : entry));
    } catch (actionError) {
      setActionError("descriptor" in readObject(actionError)
        ? actionError as ResolvedClientActionError
        : resolveClientActionError(actionError, {
          surface: "creator_dashboard",
          route: "/api/creator/bookings",
          fallbackKey: "mutation_failed",
          context: { manager: "bookings", stage: "mutation", action, bookingId: booking.id },
        }));
    } finally {
      if (pendingActionIdRef.current === actionKey) {
        pendingActionIdRef.current = null;
        setPendingActionId(null);
      }
    }
  }
const unavailableMessage = restricted
    ? "Bookings are restricted for this creator."
    : enabled
      ? availabilityConfigured
        ? "Booking management uses the existing booking route."
        : "Configure availability before accepting bookings."
      : "Configuration-only until bookings are enabled.";
return { creatorName, enabled, restricted, readOnly, sourceState, availabilityConfigured, bookings, loading, actionError, pendingActionId, bugReporter, canLoadBookings, managementState, loadBookings, handleAction, unavailableMessage };
}
