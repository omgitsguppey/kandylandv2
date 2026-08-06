import type { ComponentPropsWithoutRef } from "react";

import { CreatorDashboardGlassFrame } from "@/components/Creators/CreatorDashboardGlassFrame";

type CreatorWorkspaceFrameProps = ComponentPropsWithoutRef<"section">;

export function CreatorWorkspaceFrame({ children, className, ...props }: CreatorWorkspaceFrameProps) {
    return (
        <section
            {...props}
            className={["relative isolate", className].filter(Boolean).join(" ")}
            data-creator-workspace-frame="true"
        >
            <CreatorDashboardGlassFrame>{children}</CreatorDashboardGlassFrame>
        </section>
    );
}
