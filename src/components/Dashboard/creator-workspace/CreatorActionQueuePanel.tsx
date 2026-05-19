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
                <div className="rounded-[1.4rem] border border-white/10 bg-black/35 p-3 sm:p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Pending Requests</h3>
                    <div className="mt-3 space-y-2">
                        {requests.slice(0, 3).map((request) => (
                            <div key={request.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                                <p className="truncate text-sm font-semibold text-white">
                                    {request.categoryLabel} <span className="text-xs text-emerald-400">{request.priceGd} GD</span>
                                </p>
                                <div className="flex shrink-0 gap-1">
                                    {request.status === "pending" && (
                                        <>
                                            <button onClick={() => onRequestAction(request.id, "accept")} disabled={busyAction !== null || isProjectionMode} className="rounded-lg bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300 transition-colors hover:bg-emerald-500/30">Accept</button>
                                            <button onClick={() => onRequestAction(request.id, "decline")} disabled={busyAction !== null || isProjectionMode} className="rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-300 transition-colors hover:bg-red-500/20">Deny</button>
                                        </>
                                    )}
                                    {request.status === "accepted" ? (
                                        <button onClick={() => onRequestAction(request.id, "fulfill")} disabled={busyAction !== null || isProjectionMode} className="rounded-lg bg-brand-purple/20 px-2 py-1 text-[10px] font-bold text-brand-purple transition-colors hover:bg-brand-purple/30">Done</button>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {bookings.length > 0 && (
                <div className="rounded-[1.4rem] border border-white/10 bg-black/35 p-3 sm:p-4" data-testid="creator-workspace-bookings">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Bookings</h3>
                    <div className="mt-3 space-y-2">
                        {bookings.slice(0, 3).map((booking) => (
                            <div key={booking.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                                <p className="truncate text-sm font-semibold text-white">{formatStatusLabel(booking.serviceType)} Call - {formatStatusLabel(booking.status)}</p>
                                <div className="flex shrink-0 gap-1">
                                    {booking.status === "booked" ? (
                                        <button onClick={() => onBookingAction(booking.id, "complete")} disabled={busyAction !== null || isProjectionMode} className="rounded-lg bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300 transition-colors hover:bg-emerald-500/30">Mark done</button>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {bookingsModuleError ? (
                <UiContinuityNotice
                    title="Bookings module degraded"
                    body="Bookings are not loading right now. Try again in a bit."
                    tone="warning"
                    data-testid="creator-workspace-bookings-warning"
                />
            ) : bookingsModuleState.status === "success" && bookings.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/25 p-3 text-xs text-gray-300 sm:p-4 sm:text-sm" data-testid="creator-workspace-bookings-empty">
                    No active phone or video bookings are hydrated right now.
                </div>
            ) : null}
        </>
    );
}
