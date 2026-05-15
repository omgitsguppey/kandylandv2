"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Loader2, RefreshCw } from "lucide-react";

import { authFetch } from "@/lib/authFetch";
import { cn } from "@/lib/utils";

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

type CreatorBookingsManagerProps = {
  creatorId: string;
  creatorName: string;
  enabled: boolean;
  restricted: boolean;
  readOnly: boolean;
  sourceState: SectionState;
  availabilityConfigured: boolean;
};

function statusTone(status: BookingStatus | undefined) {
  switch (status) {
    case "booked":
    case "upcoming":
    case "in_progress":
      return "border-sky-300/20 bg-sky-500/10 text-sky-100";
    case "completed":
      return "border-emerald-300/20 bg-emerald-500/10 text-emerald-100";
    case "canceled":
      return "border-red-300/20 bg-red-500/10 text-red-100";
    default:
      return "border-white/10 bg-white/5 text-gray-200";
  }
}

function formatCount(count: number) {
  return `${count.toLocaleString()} booking${count === 1 ? "" : "s"}`;
}

function formatDate(value: unknown) {
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

export function CreatorBookingsManager({
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
  const [error, setError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
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
      setError(null);
      setLoading(false);
      return;
    }

    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(bookingsUrl);
      const body = await response.json().catch(() => ({})) as CreatorBookingsResponse;
      if (!response.ok) {
        throw new Error(body.error || body.message || "Bookings are unavailable.");
      }
      if (loadRequestIdRef.current === requestId) {
        setBookings(normalizeBookings(body.bookings));
      }
    } catch (loadError) {
      if (loadRequestIdRef.current === requestId) {
        setError(loadError instanceof Error ? loadError.message : "Bookings are unavailable.");
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
    setError(null);
    try {
      const response = await authFetch("/api/creator/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, action }),
      });
      const body = await response.json().catch(() => ({})) as CreatorBookingsResponse;
      if (!response.ok) {
        throw new Error(body.error || body.message || "Booking action failed.");
      }

      const nextStatus = body.status || (action === "complete" ? "completed" : "canceled");
      setBookings((current) => current.map((entry) => entry.id === booking.id ? { ...entry, status: nextStatus } : entry));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Booking action failed.");
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

  return (
    <section
      className="rounded-3xl border border-white/10 bg-black/45 p-4 sm:p-5"
      data-creator-bookings-manager
      data-testid="creator-bookings-manager"
      data-creator-bookings-source-state={sourceState}
      data-creator-bookings-load-state={canLoadBookings ? "connected" : "configuration_only"}
      data-creator-bookings-read-only={readOnly ? "true" : "false"}
      data-creator-bookings-management-state={managementState}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Bookings</p>
          <h2 className="mt-1 text-lg font-black text-white">Manage live-time sessions</h2>
          <p className="mt-1 text-sm text-gray-300">{canLoadBookings ? `${creatorName} has ${formatCount(bookings.length)} loaded.` : unavailableMessage}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadBookings()}
          disabled={!canLoadBookings || loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {readOnly ? (
        <p className="mt-3 rounded-2xl border border-brand-purple/20 bg-brand-purple/10 px-3 py-2 text-xs font-semibold text-brand-purple">Read-only projection: booking actions are disabled.</p>
      ) : null}
      {!availabilityConfigured && enabled && !restricted ? (
        <p className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">Configure availability before accepting bookings.</p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100">{error}</p>
      ) : null}

      {!canLoadBookings ? (
        <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-300">{unavailableMessage}</p>
      ) : loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-300">
          <Loader2 className="h-4 w-4 animate-spin text-brand-purple" />
          Loading bookings
        </div>
      ) : bookings.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-300">No bookings yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {bookings.map((booking) => {
            const status = booking.status || "booked";
            const canComplete = ["booked", "upcoming", "in_progress"].includes(status);
            const canCancel = status === "booked";
            const actionDisabled = readOnly || !availabilityConfigured || Boolean(pendingActionId);
            const duration = typeof booking.durationMinutes === "number" ? `${booking.durationMinutes} min` : "Duration unavailable";
            const price = typeof booking.priceGd === "number" ? `${booking.priceGd.toLocaleString()} GD` : "Price unavailable";
            return (
              <article key={booking.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3" data-creator-booking-status={status}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-brand-purple" />
                      <h3 className="text-sm font-bold capitalize text-white">{booking.serviceType || "booking"}</h3>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]", statusTone(status))}>
                        {status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-300">{formatDate(booking.startAt)} - {duration}</p>
                    <p className="mt-1 text-xs text-gray-500">{price}</p>
                  </div>
                </div>
                {canComplete || canCancel ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canComplete ? (
                      <button
                        type="button"
                        disabled={actionDisabled}
                        onClick={() => void handleAction(booking, "complete")}
                        className="min-h-11 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Complete
                      </button>
                    ) : null}
                    {canCancel ? (
                      <button
                        type="button"
                        disabled={actionDisabled}
                        onClick={() => void handleAction(booking, "cancel")}
                        className="min-h-11 rounded-full border border-red-300/20 bg-red-500/10 px-3 py-2.5 text-xs font-bold text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
