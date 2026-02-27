"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Candy } from "lucide-react";
import Link from "next/link";
import { useAuthIdentity } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { HomeDropTicker } from "@/components/HomeDropTicker";

export default function Hero() {
    const { user } = useAuthIdentity();
    const { openAuthModal } = useUI();
    const ref = useRef(null);

    return (
        <section ref={ref} className="relative h-full md:min-h-[90vh] flex items-center justify-center overflow-hidden md:py-0">
            {/* Parallax Content */}
            <div className="relative z-10 text-center w-full max-w-7xl mx-auto px-4 md:px-8">
                <div className="mb-4 md:mb-8 flex justify-center">
                    <div className="p-4 md:p-8 relative">
                        <Candy className="w-16 h-16 text-brand-purple drop-shadow-[0_0_30px_rgba(178,140,255,0.4)] md:scale-110" />
                    </div>
                </div>

                <h1 className="font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-3 md:mb-6 pr-2" style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)' }}>
                    KandyDrops
                </h1>

                <p className="text-gray-400 font-medium max-w-xl md:max-w-3xl mx-auto mb-6 md:mb-10 leading-relaxed" style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}>
                    <span className="flex items-center gap-2 font-medium justify-center">
                        <span className="w-2 h-2 rounded-full bg-brand-green" />
                        <span className="text-white">Collect. Unwrap. Own the moment.</span>
                    </span>
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {user ? (
                        <Link href="/dashboard">
                            <Button size="lg" variant="brand" className="rounded-full px-8 py-3 w-full sm:w-auto text-base md:text-lg shadow-[0_0_40px_rgba(236,72,153,0.3)]">
                                Unwrap Now
                            </Button>
                        </Link>
                    ) : (
                        <Button
                            onClick={openAuthModal}
                            size="lg"
                            variant="brand"
                            className="rounded-full px-8 py-3 w-full sm:w-auto text-base md:text-lg shadow-[0_0_40px_rgba(236,72,153,0.3)]"
                        >
                            Unwrap Now
                        </Button>
                    )}
                    <Link href="/faq" className="w-full sm:w-auto">
                        <Button size="lg" variant="glass" className="rounded-full px-8 py-3 w-full text-base md:text-lg">
                            What&apos;s a KandyDrop?
                        </Button>
                    </Link>
                </div>

                <p className="text-xs text-gray-500 mt-3">Most active members unwrap at least once every 24 hours.</p>
                <HomeDropTicker />
            </div>

        </section>
    );
}
