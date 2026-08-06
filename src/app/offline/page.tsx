"use client";

import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
    return (
        <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10 text-white">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-brand-purple/20 to-transparent blur-3xl" />
            <div className="relative w-full max-w-lg rounded-[2rem] border border-white/10 bg-black/45 p-6 text-center shadow-2xl shadow-brand-purple/10 backdrop-blur-xl sm:p-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-brand-purple/40 bg-brand-purple/20 text-brand-purple shadow-lg shadow-brand-purple/10">
                    <CloudOff className="h-8 w-8" />
                </div>

                <h1 className="mt-5 text-3xl font-black tracking-tight">You&apos;re offline</h1>
                <p className="mt-3 text-sm leading-7 text-gray-300">
                    KandyDrops needs a connection to refresh live drops, sync tasks, and deliver account updates. As soon as you reconnect, the app will catch back up.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Link
                        href="/drops"
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-purple/60 bg-brand-purple px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                        Browse drops
                    </Link>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Try again
                    </button>
                </div>
            </div>
        </div>
    );
}
