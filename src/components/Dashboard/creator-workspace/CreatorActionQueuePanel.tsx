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
                <section className="rounded-[1.75rem] border border-white/10 bg-[#110b20]/90 p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
                    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black text-white">Requests waiting for you</h3><span className="rounded-xl border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-bold text-zinc-400">{requests.length}</span></div>
                    <div className="mt-3 space-y-2">
                        {requests.slice(0, 3).map((request) => (
                            <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                                <p className="min-w-0 truncate text-sm font-semibold text-white">
                                    {request.categoryLabel} <span className="ml-1 text-xs text-emerald-300">{request.priceGd} GD</span>
                                </p>
                                <div className="flex shrink-0 gap-1">
                                    {request.status === "pending" && (
                                        <>
                                            <button onClick={() => onRequestAction(request.id, "accept")} disabled={busyAction !== null || isProjectionMode} className="min-h-11 rounded-xl bg-emerald-500/20 px-3 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-500/30 disabled:opacity-50">Accept</button>
                                            <button onClick={() => onRequestAction(request.id, "decline")} disabled={busyAction !== null || isProjectionMode} className="min-h-11 rounded-xl bg-red-500/10 px-3 text-xs font-bold text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-50">Decline</button>
                                        </>
                                    )}
                                    {request.status === "accepted" ? (
                                        <button onClick={() => onRequestAction(request.id, "fulfill")} disabled={busyAction !== null || isProjectionMode} className="min-h-11 rounded-xl bg-brand-purple/20 px-3 text-xs font-bold text-purple-100 transition-colors hover:bg-brand-purple/30 disabled:opacity-50">Mark complete</button>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {bookings.length > 0 && (
                <section className="rounded-[1.75rem] border border-white/10 bg-[#110b20]/90 p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]" data-testid="creator-workspace-bookings">
                    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black text-white">Booked creator time</h3><span className="rounded-xl border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-bold text-zinc-400">{bookings.length}</span></div>
                    <div className="mt-3 space-y-2">
                        {bookings.slice(0, 3).map((booking) => (
                            <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                                <p className="min-w-0 truncate text-sm font-semibold text-white">{formatStatusLabel(booking.serviceType)} call <span className="ml-1 text-xs text-zinc-500">{formatStatusLabel(booking.status)}</span></p>
                                <div className="flex shrink-0 gap-1">
                                    {booking.status === "booked" ? (
                                        <button onClick={() => onBookingAction(booking.id, "complete")} disabled={busyAction !== null || isProjectionMode} className="min-h-11 rounded-xl bg-emerald-500/20 px-3 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-500/30 disabled:opacity-50">Mark complete</button>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {bookingsModuleError ? (
                <UiContinuityNotice
                    title="Bookings module degraded"
                    body="Bookings are not loading right now. Try again in a bit."
                    tone="warning"
                    data-testid="creator-workspace-bookings-warning"
                />
            ) : bookingsModuleState.status === "success" && bookings.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-zinc-300" data-testid="creator-workspace-bookings-empty">
                    No active phone or video bookings are hydrated right now.
                </div>
            ) : null}
        </>
    );
}
