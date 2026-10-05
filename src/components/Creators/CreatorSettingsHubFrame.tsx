import type { ComponentPropsWithoutRef } from "react";

import { ContentFrame } from "@/components/ui/content-layout";

type CreatorSettingsHubFrameProps = ComponentPropsWithoutRef<"div">;

export function CreatorSettingsHubFrame({ children, className, ...props }: CreatorSettingsHubFrameProps) {
    return (
        <ContentFrame>
            <div
                {...props}
                className={["relative isolate", className].filter(Boolean).join(" ")}
                data-creator-settings-frame="true"
                data-creator-settings-studio-frame="true"
            >
                {children}
            </div>
        </ContentFrame>
    );
}
