"use client";

import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

import { KandyStateSurface } from "@/components/creative-tim/kandydrops/states/KandyStateSurface";

export default function OfflinePage() {
    return (
        <KandyStateSurface
            tone="violet"
            eyebrow="Connection interrupted"
            title="You're offline"
            description="KandyDrops needs a connection to refresh live drops, sync tasks, and deliver account updates. As soon as you reconnect, the app will catch back up."
            icon={CloudOff}
        >
            <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                        href="/drops"
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-brand-purple/60 bg-brand-purple px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08040f]"
                    >
                        Browse drops
                    </Link>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08040f]"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Try again
                    </button>
            </div>
        </KandyStateSurface>
    );
}
