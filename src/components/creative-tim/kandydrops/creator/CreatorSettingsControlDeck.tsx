"use client";

import { ContentSection, SectionHeader } from "@/components/ui/content-layout";
import { Card } from "@/components/ui/card";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/Button";
import type { ReactNode } from "react";
import { CreatorSettingsScopePicker, type CreatorSettingsRunwayScope } from "./CreatorSettingsWorkstreamRail";

type CreatorSettingsControlDeckProps = {
    activeScope: CreatorSettingsRunwayScope;
    children?: ReactNode;
    completionLabel?: string;
    isReadOnly: boolean;
    notice?: ReactNode;
    onSelectScope: (id: string) => void;
    saveError?: string | null;
    scopes: CreatorSettingsRunwayScope[];
    sourceFreshness?: string;
    sourceState?: string;
    sourceTruth?: string;
};

function valueOrFallback(value: string | undefined, fallback: string) {
    return value ? value.replaceAll("_", " ") : fallback;
}

export function CreatorSettingsControlDeck({
    activeScope,
    children,
    completionLabel,
    isReadOnly,
    notice,
    onSelectScope,
    saveError,
    scopes,
    sourceFreshness,
    sourceState,
    sourceTruth,
}: CreatorSettingsControlDeckProps) {
    return (
        <ContentSection
            className="space-y-5"
            data-creator-settings-control-plane="true"
            data-creator-settings-user-facing-safe="true"
            data-mobile-density="compact"
            data-mobile-sprawl-guard="true"
        >
            <header className="space-y-4">
                <SectionHeader level={1} title="Creator settings" description="Choose a setting or operation to manage." accessory={<Badge variant="secondary">{isReadOnly ? "Read-only" : completionLabel ?? "Settings"}</Badge>} />

                <dl
                    className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs"
                    data-creator-settings-source-state={sourceState ?? "unknown"}
                    data-creator-settings-source-truth={sourceTruth ?? "unknown"}
                    data-creator-settings-source-freshness={sourceFreshness ?? "unknown"}
                >
                    <div className="flex items-baseline gap-1.5">
                        <dt className="font-semibold uppercase tracking-wide text-muted-foreground">Settings</dt>
                        <dd className="font-semibold capitalize text-foreground">{valueOrFallback(sourceState, "checking")}</dd>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <dt className="font-semibold uppercase tracking-wide text-muted-foreground">Source</dt>
                        <dd className="font-semibold capitalize text-foreground">{valueOrFallback(sourceTruth, "not available")}</dd>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <dt className="font-semibold uppercase tracking-wide text-muted-foreground">Freshness</dt>
                        <dd className="font-semibold capitalize text-foreground">{valueOrFallback(sourceFreshness, "not available")}</dd>
                    </div>
                </dl>
            </header>

            <div className="px-1 sm:px-0">
                <CreatorSettingsScopePicker activeId={activeScope.id} items={scopes} onSelect={onSelectScope} />
            </div>

            <div className="space-y-4">
                {notice ? <div>{notice}</div> : null}
                {saveError ? (
                    <Card className="gap-0 py-0 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
                        {saveError}
                    </Card>
                ) : null}

                <ContentSection
                    className="min-w-0"
                    data-creator-active-scope={activeScope.id}
                    data-creator-active-manager={activeScope.kind === "operation" ? activeScope.id : "none"}
                    data-creator-section-key={activeScope.id}
                    data-creator-section-state={activeScope.state}
                    data-creator-stats-source-truth={activeScope.sourceTruth ?? "not_applicable"}
                    data-creator-stats-source-freshness={activeScope.sourceFreshness ?? "not_applicable"}
                    data-creator-stats-sample-count={activeScope.sampleCount ?? 0}
                    data-creator-fan-pass-management-state={activeScope.fanPassManagementState}
                    data-creator-bookings-management-state={activeScope.bookingsManagementState}
                    data-creator-chat-route-connected={activeScope.chatRouteConnected === undefined ? undefined : String(activeScope.chatRouteConnected)}
                    data-creator-earnings-source={activeScope.creatorEarningsSource}
                    data-creator-earnings-attribution={activeScope.creatorEarningsAttribution}
                    data-mobile-drilldown="true"
                    data-desktop-flow-collapsed="true"
                >
                    <SectionHeader title={activeScope.title} description={activeScope.summary} accessory={<Badge variant="secondary">{activeScope.state.replaceAll("_", " ")}</Badge>} />
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{activeScope.detail}</p>
                    {activeScope.href ? (
                        <Link href={activeScope.href} className={buttonVariants({ variant: "outline", className: "mt-4" })}>
                            {activeScope.actionLabel ?? "Open"}
                        </Link>
                    ) : null}
                    <div className="mt-5" data-creator-active-control-deck={activeScope.id}>
                        {children ?? (
                            <p className="rounded-2xl border border-dashed border-border bg-secondary px-4 py-4 text-sm leading-6 text-muted-foreground">This focus has no inline manager. Use the connected destination above.</p>
                        )}
                    </div>
                </ContentSection>
            </div>
        </ContentSection>
    );
}
