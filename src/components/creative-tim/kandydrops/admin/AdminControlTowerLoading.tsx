function LoadingBar({ className }: { className: string }) {
    return <div className={`rounded-full bg-white/10 ${className}`} />;
}

function LoadingPanel({ rows }: { rows: number }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-inner shadow-black/15 md:p-4">
            <LoadingBar className="h-3 w-32" />
            <div className="mt-3 space-y-2">
                {Array.from({ length: rows }).map((_, index) => (
                    <div key={index} className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <LoadingBar className="h-3 w-24" />
                        <LoadingBar className="mt-2 h-3 w-full bg-white/5" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function AdminControlTowerLoading() {
    return (
        <div aria-busy="true" aria-label="Loading admin control tower" className="space-y-3 animate-pulse md:space-y-4">
            <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 md:p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div className="space-y-3">
                        <LoadingBar className="h-3 w-28" />
                        <LoadingBar className="h-9 w-64 max-w-full bg-white/15" />
                        <LoadingBar className="h-3 w-80 max-w-full bg-white/5" />
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <LoadingBar className="h-3 w-28" />
                        <LoadingBar className="mt-3 h-4 w-20 bg-white/15" />
                    </div>
                </div>
            </section>

            <div className="grid gap-3 xl:grid-cols-12">
                <div className="xl:col-span-12"><LoadingPanel rows={3} /></div>
                <div className="xl:col-span-7"><LoadingPanel rows={5} /></div>
                <div className="xl:col-span-5"><LoadingPanel rows={4} /></div>
                <div className="xl:col-span-12"><LoadingPanel rows={4} /></div>
            </div>
        </div>
    );
}
