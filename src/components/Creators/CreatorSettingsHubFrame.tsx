import type { ComponentPropsWithoutRef } from "react";

import { CreatorDashboardGlassFrame } from "@/components/Creators/CreatorDashboardGlassFrame";

type CreatorSettingsHubFrameProps = ComponentPropsWithoutRef<"div">;

export function CreatorSettingsHubFrame({ children, className, ...props }: CreatorSettingsHubFrameProps) {
    return (
        <div
            {...props}
            className={["relative isolate", className].filter(Boolean).join(" ")}
            data-creator-settings-frame="true"
        >
            <CreatorDashboardGlassFrame>{children}</CreatorDashboardGlassFrame>
        </div>
    );
}
