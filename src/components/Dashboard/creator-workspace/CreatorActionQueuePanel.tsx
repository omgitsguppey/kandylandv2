import { Badge } from "@/components/ui/badge";
import { ContentSection, GroupedList, GroupedRow } from "@/components/ui/content-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { UiContinuityNotice } from "@/components/ui/UiContinuityNotice";
import type { UiContinuityModuleState } from "@/lib/ui-continuity";
import { formatStatusLabel, type CreatorBookingRecord, type CreatorRequestRecord } from "./types";

export function CreatorActionQueuePanel({
    requests,
    bookings,
    bookingsModuleError,
    bookingsModuleState,
    busyAction,
    isProjectionMode,
    onRequestAction,
    onBookingAction,
}: {
    requests: CreatorRequestRecord[];
    bookings: CreatorBookingRecord[];
    bookingsModuleError: string | null;
    bookingsModuleState: UiContinuityModuleState;
    busyAction: string | null;
    isProjectionMode: boolean;
    onRequestAction: (requestId: string, action: "accept" | "decline" | "fulfill") => void;
    onBookingAction: (bookingId: string, action: "complete" | "cancel") => void;
}) {
    return (
        <>
            {requests.length > 0 && (
                <ContentSection className="space-y-4">
                    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-foreground">Requests waiting for you</h3><Badge variant="secondary" className="rounded-xl bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">{requests.length}</Badge></div>
                    <GroupedList className="mt-3">
                        {requests.slice(0, 3).map((request) => (
                            <GroupedRow key={request.id}>
                                <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                                    {request.categoryLabel} <span className="ml-1 text-xs text-success">{request.priceGd} GD</span>
                                </p>
                                <div className="flex shrink-0 gap-1">
                                    {request.status === "pending" && (
                                        <>
                                            <Button variant="ghost" onClick={() => onRequestAction(request.id, "accept")} disabled={busyAction !== null || isProjectionMode} className="min-h-11 rounded-xl bg-success/20 px-3 text-xs font-semibold text-success transition-colors hover:bg-success/30 disabled:opacity-50">Accept</Button>
                                            <Button variant="ghost" onClick={() => onRequestAction(request.id, "decline")} disabled={busyAction !== null || isProjectionMode} className="min-h-11 rounded-xl bg-destructive/10 px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50">Decline</Button>
                                        </>
                                    )}
                                    {request.status === "accepted" ? (
                                        <Button variant="ghost" onClick={() => onRequestAction(request.id, "fulfill")} disabled={busyAction !== null || isProjectionMode} className="min-h-11 rounded-xl bg-primary/20 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/30 disabled:opacity-50">Mark complete</Button>
                                    ) : null}
                                </div>
                            </GroupedRow>
                        ))}
                    </GroupedList>
                </ContentSection>
            )}

            {bookings.length > 0 && (
                <ContentSection className="space-y-4" data-testid="creator-workspace-bookings">
                    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-foreground">Booked creator time</h3><Badge variant="secondary" className="rounded-xl bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">{bookings.length}</Badge></div>
                    <GroupedList className="mt-3">
                        {bookings.slice(0, 3).map((booking) => (
                            <GroupedRow key={booking.id}>
                                <p className="min-w-0 truncate text-sm font-semibold text-foreground">{formatStatusLabel(booking.serviceType)} call <span className="ml-1 text-xs text-muted-foreground">{formatStatusLabel(booking.status)}</span></p>
                                <div className="flex shrink-0 gap-1">
                                    {booking.status === "booked" ? (
                                        <Button variant="ghost" onClick={() => onBookingAction(booking.id, "complete")} disabled={busyAction !== null || isProjectionMode} className="min-h-11 rounded-xl bg-success/20 px-3 text-xs font-semibold text-success transition-colors hover:bg-success/30 disabled:opacity-50">Mark complete</Button>
                                    ) : null}
                                </div>
                            </GroupedRow>
                        ))}
                    </GroupedList>
                </ContentSection>
            )}

            {bookingsModuleError ? (
                <UiContinuityNotice
                    title="Bookings module degraded"
                    body="Bookings are not loading right now. Try again in a bit."
                    tone="warning"
                    data-testid="creator-workspace-bookings-warning"
                />
            ) : bookingsModuleState.status === "success" && bookings.length === 0 ? (
                <Card className="gap-0 py-0 rounded-2xl border border-dashed border-border bg-secondary p-4 text-sm text-muted-foreground" data-testid="creator-workspace-bookings-empty">
                    No active phone or video bookings are hydrated right now.
                </Card>
            ) : null}
        </>
    );
}
