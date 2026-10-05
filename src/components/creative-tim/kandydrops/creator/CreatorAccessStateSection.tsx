import { ContentSection } from "@/components/ui/content-layout";
import type { ReactNode } from "react";

type CreatorAccessStateSectionProps = {
    action: ReactNode;
    eyebrow: string;
    heading: string;
    status: ReactNode;
    summary: string;
};

export function CreatorAccessStateSection({
    action,
    eyebrow,
    heading,
    status,
    summary,
}: CreatorAccessStateSectionProps) {
    return (
        <ContentSection aria-labelledby="creator-access-state-heading" className="relative isolate overflow-hidden border-y border-border py-6 sm:py-8">
            <div className="relative max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
                <h1 id="creator-access-state-heading" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{heading}</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary}</p>
            </div>

            <div className="relative mt-6 space-y-4 border-t border-border pt-4">
                <div aria-label="Creator application status" className="flex flex-wrap gap-2">
                    {status}
                </div>
                <div>{action}</div>
            </div>
        </ContentSection>
    );
}
