import type { ComponentPropsWithoutRef } from "react";

import { CreatorStudioCanvas } from "@/components/creative-tim/kandydrops/creator/CreatorStudioCanvas";

type CreatorWorkspaceFrameProps = ComponentPropsWithoutRef<"section">;

export function CreatorWorkspaceFrame({ children, className, ...props }: CreatorWorkspaceFrameProps) {
    return (
        <section
            {...props}
            className={["relative isolate", className].filter(Boolean).join(" ")}
            data-creator-workspace-frame="true"
        >
            <CreatorStudioCanvas>{children}</CreatorStudioCanvas>
        </section>
    );
}
