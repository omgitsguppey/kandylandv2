"use client";

import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-white">
            <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/40">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-brand-purple/30 bg-brand-purple/15 text-brand-purple">
                    <CloudOff className="h-8 w-8" />
                </div>

                <h1 className="mt-5 text-3xl font-black">You&apos;re offline</h1>
                <p className="mt-3 text-sm leading-7 text-gray-300">
                    KandyDrops needs a connection to refresh live drops, sync tasks, and deliver account updates. As soon as you reconnect, the app will catch back up.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Link
                        href="/drops"
                        className="inline-flex min-h-12 items-center justify-center rounded-full border border-brand-purple bg-brand-purple px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                    >
                        Browse drops
                    </Link>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Try again
                    </button>
                </div>
            </div>
        </div>
    );
}
