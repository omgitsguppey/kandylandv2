"use client";

export function KandyLoadingStateSurface() {
    return (
        <main
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#08040f] px-5 text-center"
            role="status"
            aria-live="polite"
            aria-label="Please wait"
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_22%,rgba(178,140,255,0.24),transparent_26%),radial-gradient(circle_at_80%_75%,rgba(255,111,207,0.13),transparent_30%),linear-gradient(155deg,rgba(18,7,30,0.96),rgba(5,3,10,1))]" aria-hidden="true" />
            <div className="relative flex flex-col items-center">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] border border-brand-purple/25 bg-black/25 shadow-[0_0_0_1px_rgba(178,140,255,0.08),0_28px_72px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                    <div className="absolute inset-2 rounded-[1.45rem] border border-white/10" aria-hidden="true" />
                    <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-brand-purple/20 border-t-brand-purple" aria-hidden="true" />
                </div>
                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-brand-purple">Please wait</p>
                <span className="sr-only">KandyDrops is loading.</span>
            </div>
        </main>
    );
}
