import { Badge } from "@/components/ui/badge";
import { ContentSection, GroupedList } from "@/components/ui/content-layout";
import { Card } from "@/components/ui/card";
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
        <ContentSection
            className="rounded-2xl bg-card p-5 "
            data-testid="creator-workspace-subscriptions"
            data-fan-pass-crm="mobile_v1"
            data-raw-user-id-hidden="true"
        >
            <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Fan pass</p><h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">Fan Pass subscribers</h3></div>
                <Badge variant="secondary" className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground">{subscriptions.length} active</Badge>
            </div>
            <div className="mt-5">
                {subscriptions.length > 0 ? (
                    <GroupedList className="mt-4">
                        {subscriptions.slice(0, 4).map((subscription) => (
                            <FanPassSubscriberRow key={subscription.id} subscriber={subscription} />
                        ))}
                    </GroupedList>
                ) : (
                    <Card className="gap-0 py-0 rounded-2xl border border-dashed border-border bg-secondary px-4 py-4 text-sm text-muted-foreground">
                        No subscriber rows are active yet.
                    </Card>
                )}
            </div>
        </ContentSection>
    );
}
