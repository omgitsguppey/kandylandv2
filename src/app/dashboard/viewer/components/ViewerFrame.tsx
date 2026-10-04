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
    <div className="min-h-dvh bg-slate-950 pb-10 text-white selection:bg-brand-purple/30 selection:text-white">
      <div className="mx-auto w-full max-w-7xl px-3 pt-3 sm:px-5 sm:pt-5 lg:px-6">
        <header className="mb-4 flex min-h-11 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/75 px-3 py-2 shadow-xl shadow-black/15 backdrop-blur-xl sm:px-4">
          {backBar}
          <p className="hidden text-sm font-medium text-slate-400 sm:block">Private viewing room</p>
        </header>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl shadow-black/30">
          <div className={`relative w-full overflow-hidden bg-black ${viewerStageHeight}`}>
            {securityOverlay}
            {mediaStage}
          </div>
          {thumbnailRail ? <div className="border-t border-white/10 bg-slate-950/90 px-3 py-3 sm:px-4">{thumbnailRail}</div> : null}
        </section>

        <section className="mt-6">{details}</section>
      </div>
      {satisfaction}
    </div>
  );
}
