import { FanPassSubscriberRow } from "@/components/Creators/FanPassSubscriberRow";
import { UiContinuityNotice } from "@/components/ui/UiContinuityNotice";
import type { CreatorSubscriptionRecord } from "./types";

export function CreatorFanPassCrmPanel({
    subscriptions,
    subscriptionsModuleError,
}: {
    subscriptions: CreatorSubscriptionRecord[];
    subscriptionsModuleError: string | null;
}) {
    if (subscriptionsModuleError) {
        return (
            <UiContinuityNotice
                title="Subscriptions module degraded"
                body="Fan Pass subscribers are not loading right now. Try again in a bit."
                tone="warning"
                data-testid="creator-workspace-subscriptions-warning"
            />
        );
    }

    return (
        <section
            className="rounded-[1.75rem] border border-white/10 bg-[#110b20]/90 p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]"
            data-testid="creator-workspace-subscriptions"
            data-fan-pass-crm="mobile_v1"
            data-raw-user-id-hidden="true"
        >
            <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-widest text-purple-200">Fan pass</p><h3 className="mt-1 text-lg font-black tracking-tight text-white">Your closest audience</h3></div>
                <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-zinc-300">{subscriptions.length} active</span>
            </div>
            <div className="mt-5">
                {subscriptions.length > 0 ? (
                    <div className="mt-3 space-y-2">
                        {subscriptions.slice(0, 4).map((subscription) => (
                            <FanPassSubscriberRow key={subscription.id} subscriber={subscription} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm text-zinc-300">
                        No subscriber rows are active yet.
                    </div>
                )}
            </div>
        </section>
    );
}
