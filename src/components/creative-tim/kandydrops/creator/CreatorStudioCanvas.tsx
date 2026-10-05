import type { ReactNode } from "react";
import { ContentSection } from "@/components/ui/content-layout";

export function CreatorStudioCanvas({ children, className }: { children: ReactNode; className?: string }) {
    return <ContentSection className={className} data-creator-studio-canvas="soft-ui-kandy">{children}</ContentSection>;
}
