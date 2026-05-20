"use client";

export default function DropsLoading() {
    return (
        <div
            className="mx-auto w-full max-w-7xl px-3 pt-[calc(var(--kandy-cookie-offset,0px)+0.75rem)] pb-4 sm:px-4 md:px-8 md:pt-0 md:pb-8"
            data-mobile-density="compact"
            data-mobile-sprawl-guard="true"
            data-mobile-skeleton="drops-route"
        >
            <div className="mb-2 h-16 rounded-[1.25rem] border border-white/8 bg-white/[0.045] md:mb-5 md:h-20 md:rounded-[1.5rem]" />

            <div className="mb-3 h-24 rounded-[1.25rem] border border-white/8 bg-white/[0.035] md:h-28 md:rounded-[1.5rem]" />

            <div className="mb-3 h-36 animate-pulse rounded-[1.25rem] border border-white/10 bg-zinc-900/50 sm:h-56 md:mb-4 md:h-[320px] md:rounded-[2rem]" />

            <div className="mb-2 flex items-center justify-between px-1 md:mb-4 md:px-0">
                <div className="h-6 w-36 rounded-[0.65rem] bg-white/5 md:h-8 md:w-48" />
                <div className="h-7 w-12 rounded-[0.7rem] bg-white/5" />
            </div>

            <div className="sticky top-[calc(env(safe-area-inset-top)+4.25rem)] z-40 -mx-1 mb-2 rounded-[1.35rem] border border-white/8 bg-black/62 p-1.5 backdrop-blur-xl md:top-24 md:mx-0 md:mb-4 md:rounded-[1.5rem]">
                <div className="grid gap-1.5 md:grid-cols-[minmax(14rem,18rem)_1fr] md:items-center md:gap-3">
                    <div className="h-10 rounded-[1rem] bg-white/[0.055]" />
                    <div className="flex gap-1.5 overflow-hidden">
                        {[1, 2, 3, 4].map((item) => (
                            <div key={item} className="h-10 w-20 shrink-0 rounded-[0.95rem] bg-white/[0.055]" />
                        ))}
                    </div>
                </div>
            </div>

            <div className="rounded-[1.45rem] border border-white/5 bg-white/[0.01] p-1.5 md:rounded-[2rem] md:p-5">
                <div className="grid grid-cols-2 gap-2 pb-6 sm:gap-3 md:grid-cols-3 md:gap-5 md:pb-0 lg:grid-cols-4">
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                        <div
                            key={item}
                            className="h-[190px] animate-pulse rounded-[1.15rem] border border-white/8 bg-white/[0.035] md:h-[330px] md:rounded-[1.35rem]"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
