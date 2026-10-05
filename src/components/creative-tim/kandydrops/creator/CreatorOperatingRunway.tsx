import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/Button";
import { ContentSection, ContentGrid, GroupedList, GroupedRow, SectionHeader } from "@/components/ui/content-layout";
import { CREATOR_DROP_MANAGE_ROUTE, CREATOR_SETTINGS_ROUTE } from "@/lib/creator-profile-routing";

export type CreatorRunwayFact = { label: string; value: string; detail: string };
type CreatorOperatingRunwayProps = {
    actionNeededCount: number;
    connection: ReactNode;
    context: ReactNode;
    facts: CreatorRunwayFact[];
    isProjectionMode: boolean;
    nextAction: ReactNode;
    overviewStatus: string;
    projectionDisplayName: string;
    sourceNotice: ReactNode;
};

export function CreatorOperatingRunway({ actionNeededCount, connection, context, facts, isProjectionMode, nextAction, overviewStatus, projectionDisplayName, sourceNotice }: CreatorOperatingRunwayProps) {
    const actionLabel = actionNeededCount === 1 ? "1 item needs you" : `${actionNeededCount} items need you`;
    return (
        <ContentSection data-creator-operating-runway="true" data-creator-dashboard-layout="serial_runway" data-mobile-density="compact" data-mobile-sprawl-guard="true">
            {isProjectionMode ? (
                <GroupedList><GroupedRow>
                    <p className="text-sm text-foreground">Viewing {projectionDisplayName}&apos;s creator runway</p>
                    <Badge variant="info">Read-only projection</Badge>
                </GroupedRow></GroupedList>
            ) : null}
            <SectionHeader level={1} title="Creator studio" description="Manage content, earnings, and fan activity." accessory={<div className="flex flex-wrap items-center gap-3"><Badge variant="secondary">Studio: {overviewStatus}</Badge><span>{actionLabel}</span></div>} />
            {sourceNotice}
            <ContentSection data-creator-runway-stage="context">
                <SectionHeader title="Overview & earnings" />
                <GroupedList>
                    {facts.map((fact) => (
                        <GroupedRow key={fact.label}>
                            <p className="text-sm font-medium text-foreground">{fact.label}</p>
                            <div className="min-w-0 text-right">
                                <p className="break-words text-lg font-semibold tabular-nums text-foreground">{fact.value}</p>
                                <p className="text-xs text-muted-foreground">{fact.detail}</p>
                            </div>
                        </GroupedRow>
                    ))}
                </GroupedList>
            </ContentSection>
            <ContentSection>
                <SectionHeader title="Content management" />
                <GroupedList><GroupedRow>
                    <div className="min-w-0"><p className="font-medium text-foreground">Drops & settings</p><p className="text-sm text-muted-foreground">Create, submit, and track review and visibility.</p></div>
                    <nav aria-label="Creator content tools" className="flex flex-wrap gap-2">
                        {isProjectionMode ? <Badge variant="info">Read-only projection</Badge> : <Link href={CREATOR_DROP_MANAGE_ROUTE} className={buttonVariants({ variant: "brand" })}>Manage drops</Link>}
                        <Link href={CREATOR_SETTINGS_ROUTE} className={buttonVariants({ variant: "outline" })}>Settings</Link>
                    </nav>
                </GroupedRow></GroupedList>
            </ContentSection>
            <ContentSection data-creator-runway-stage="next_action">
                <SectionHeader title="Requests & bookings" />
                {nextAction}
            </ContentSection>
            <ContentSection>
                <SectionHeader title="Fans & engagement" />
                <ContentGrid>
                    <ContentSection data-creator-runway-stage="connection">{connection}</ContentSection>
                    <ContentSection data-creator-runway-stage="audience">{context}</ContentSection>
                </ContentGrid>
            </ContentSection>
        </ContentSection>
    );
}
