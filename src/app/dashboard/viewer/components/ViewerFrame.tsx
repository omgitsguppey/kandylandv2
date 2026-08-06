import type { ReactNode } from "react";

interface ViewerFrameProps {
    backBar: ReactNode;
    securityOverlay: ReactNode;
    mediaStage: ReactNode;
    thumbnailRail: ReactNode;
    details: ReactNode;
    satisfaction: ReactNode;
    viewerStageHeight: string;
}

export function ViewerFrame({
    backBar,
    securityOverlay,
    mediaStage,
    thumbnailRail,
    details,
    satisfaction,
    viewerStageHeight,
}: ViewerFrameProps) {
    return (
        <div className="min-h-screen bg-[#0a0a0a] pb-24 font-sans selection:bg-brand-purple/30 selection:text-white">
            <section className="sticky top-0 relative z-10 border-b border-white/5 bg-black md:top-auto">
                <div className="flex items-center justify-between px-4 py-3 md:py-4">
                    {backBar}
                </div>

                <div className={`relative w-full overflow-hidden bg-[#050505] transition-all duration-500 ${viewerStageHeight}`}>
                    {securityOverlay}
                    {mediaStage}
                </div>

                {thumbnailRail}
            </section>

            {details}
            {satisfaction}
        </div>
    );
}
