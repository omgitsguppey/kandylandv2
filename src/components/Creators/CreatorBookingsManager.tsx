"use client";

import { Badge } from "@/components/ui/badge";

import { ContentSection, GroupedRow } from "@/components/ui/content-layout";

import { Button } from "@/components/ui/Button";

import { CalendarClock, Loader2, RefreshCw } from "lucide-react";
import { HumanErrorNotice } from "@/components/errors/HumanErrorNotice";

import { buildBugReportContext, getSafePreviousRoute } from "@/lib/errors/client-error-adapter";
import { cn } from "@/lib/utils";
import { type CreatorBookingsManagerProps, useCreatorBookingsManager, statusTone, formatCount, formatDate } from "./useCreatorBookingsManager";

export function CreatorBookingsManager({
  creatorId,
  creatorName,
  enabled,
  restricted,
  readOnly,
  sourceState,
  availabilityConfigured,
}: CreatorBookingsManagerProps) {
const { bookings, loading, actionError, pendingActionId, bugReporter, canLoadBookings, managementState, loadBookings, handleAction, unavailableMessage } = useCreatorBookingsManager({
  creatorId,
  creatorName,
  enabled,
  restricted,
  readOnly,
  sourceState,
  availabilityConfigured,
});

return (
    <ContentSection
      className="overflow-hidden rounded-2xl bg-card p-5  sm:p-6"
      data-creator-bookings-manager
      data-testid="creator-bookings-manager"
      data-creator-bookings-source-state={sourceState}
      data-creator-bookings-load-state={canLoadBookings ? "connected" : "configuration_only"}
      data-creator-bookings-read-only={readOnly ? "true" : "false"}
      data-creator-bookings-management-state={managementState}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Live time desk</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Sessions that need your time</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{canLoadBookings ? `${creatorName} has ${formatCount(bookings.length)} loaded.` : unavailableMessage}</p>
        </div>
        <Button variant="ghost"
          type="button"
          onClick={() => void loadBookings()}
          disabled={!canLoadBookings || loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {readOnly ? (
        <p className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">Read-only projection: booking actions are disabled.</p>
      ) : null}
      {!availabilityConfigured && enabled && !restricted ? (
        <p className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">Configure availability before accepting bookings.</p>
      ) : null}
      {actionError ? (
        <HumanErrorNotice
          descriptor={actionError.descriptor}
          compact
          className="mt-3"
          onPrimaryAction={(action) => {
            if (action === "refresh" || action === "retry") {
              void loadBookings();
            }
          }}
          onSubmitBug={() => bugReporter.submit(actionError.descriptor, buildBugReportContext({
            descriptor: actionError.descriptor,
            route: actionError.route,
            previousRoute: getSafePreviousRoute(),
            extra: actionError.context,
          }))}
        />
      ) : null}

      {!canLoadBookings ? (
        <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">{unavailableMessage}</p>
      ) : loading ? (
        <div className="mt-5 flex min-h-20 items-center gap-3 rounded-2xl bg-secondary px-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          Loading bookings
        </div>
      ) : bookings.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-secondary px-4 py-5 text-sm text-muted-foreground">No bookings yet.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {bookings.map((booking) => {
            const status = booking.status || "booked";
            const canComplete = ["booked", "upcoming", "in_progress"].includes(status);
            const canCancel = status === "booked";
            const actionDisabled = readOnly || !availabilityConfigured || Boolean(pendingActionId);
            const duration = typeof booking.durationMinutes === "number" ? `${booking.durationMinutes} min` : "Duration unavailable";
            const price = typeof booking.priceGd === "number" ? `${booking.priceGd.toLocaleString()} GD` : "Price unavailable";
            return (
              <GroupedRow key={booking.id} className="rounded-2xl bg-secondary p-4" data-creator-booking-status={status}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold capitalize text-foreground">{booking.serviceType || "booking"}</h3>
                      <Badge variant="secondary" className={cn("rounded-xl border px-2.5 py-1 text-xs font-semibold", statusTone(status))}>
                        {status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDate(booking.startAt)} - {duration}</p>
                    <p className="mt-2 inline-flex rounded-xl bg-secondary px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">{price}</p>
                  </div>
                </div>
                {canComplete || canCancel ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {canComplete ? (
                      <Button variant="ghost"
                        type="button"
                        disabled={actionDisabled}
                        onClick={() => void handleAction(booking, "complete")}
                        className="min-h-11 rounded-xl border border-success/20 bg-success/10 px-4 py-2.5 text-sm font-semibold text-success disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Complete
                      </Button>
                    ) : null}
                    {canCancel ? (
                      <Button variant="ghost"
                        type="button"
                        disabled={actionDisabled}
                        onClick={() => void handleAction(booking, "cancel")}
                        className="min-h-11 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </GroupedRow>
            );
          })}
        </div>
      )}
    </ContentSection>
  );
}
