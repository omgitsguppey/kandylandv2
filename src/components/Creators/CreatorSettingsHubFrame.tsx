import type { ComponentPropsWithoutRef } from "react";

import { CreatorStudioCanvas } from "@/components/creative-tim/kandydrops/creator/CreatorStudioCanvas";

type CreatorSettingsHubFrameProps = ComponentPropsWithoutRef<"div">;

export function CreatorSettingsHubFrame({ children, className, ...props }: CreatorSettingsHubFrameProps) {
    return (
        <CreatorStudioCanvas>
            <div
                {...props}
                className={["relative isolate", className].filter(Boolean).join(" ")}
                data-creator-settings-frame="true"
                data-creator-settings-studio-frame="true"
            >
                {children}
            </div>
        </CreatorStudioCanvas>
    );
}
