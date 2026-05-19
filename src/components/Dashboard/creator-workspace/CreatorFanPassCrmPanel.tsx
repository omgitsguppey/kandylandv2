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
        <div
            className="rounded-[1.4rem] border border-white/10 bg-black/35 p-3 sm:p-4"
            data-testid="creator-workspace-subscriptions"
            data-fan-pass-crm="mobile_v1"
            data-raw-user-id-hidden="true"
        >
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Fan Pass CRM</h3>
            {subscriptions.length > 0 ? (
                <div className="mt-3 space-y-2">
                    {subscriptions.slice(0, 4).map((subscription) => (
                        <FanPassSubscriberRow key={subscription.id} subscriber={subscription} />
                    ))}
                </div>
            ) : (
                <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300 sm:py-3 sm:text-sm">
                    No subscriber rows are active yet.
                </div>
            )}
        </div>
    );
}
