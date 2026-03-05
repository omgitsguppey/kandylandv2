"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuthIdentity } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { HomeDropTicker } from "@/components/HomeDropTicker";
import { EditableImage } from "@/components/Admin/EditableImage";
import { getSimulatedPlatformUnwrapsToday } from "@/lib/unwrap-simulator";
import { useEffect, useState } from "react";

export default function Hero() {
    const { user } = useAuthIdentity();
    const { openAuthModal } = useUI();
    const ref = useRef(null);

    return (
        <section ref={ref} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-24 pb-12 w-full">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-purple/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-brand-purple/10 rounded-full blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '7s' }} />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                {/* Left Content */}
                <div className="text-left space-y-8 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-sm font-bold tracking-wide">
                        <Sparkles className="w-4 h-4" />
                        PREMIUM DIGITAL EXPERIENCES
                    </div>

                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter text-white leading-[1.1]">
                        Unwrap<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-purple-400">
                            Exclusive
                        </span> Content.
                    </h1>

                    <p className="text-xl text-gray-400 leading-relaxed font-medium">
                        Connect intimately with your favorite creators like Jessi Ray and Bloomytrip. Unlock private collections, exclusive media, and unique experiences you won't find anywhere else.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        {user ? (
                            <Link href="/dashboard" className="w-full sm:w-auto">
                                <Button size="lg" variant="brand" className="w-full rounded-2xl px-10 py-6 text-lg font-bold shadow-[0_0_30px_rgba(178,140,255,0.4)] hover:shadow-[0_0_40px_rgba(178,140,255,0.6)] transition-all">
                                    Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                        ) : (
                            <Button
                                onClick={openAuthModal}
                                size="lg"
                                variant="brand"
                                className="w-full sm:w-auto rounded-2xl px-10 py-6 text-lg font-bold shadow-[0_0_30px_rgba(178,140,255,0.4)] hover:shadow-[0_0_40px_rgba(178,140,255,0.6)] transition-all"
                            >
                                Get iKandy <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        )}
                        <Link href="/faq" className="w-full sm:w-auto">
                            <Button size="lg" variant="glass" className="w-full rounded-2xl px-8 py-6 text-lg font-bold border-white/10 hover:bg-white/5">
                                See How It Works
                            </Button>
                        </Link>
                    </div>

                    <div className="pt-2 pb-2">
                        <ActivityTicker />
                    </div>

                    <div className="pt-4 border-t border-white/10 w-4/5 pt-8">
                        <p className="text-sm text-gray-400 font-medium mb-4">Latest Unwraps</p>
                        <HomeDropTicker />
                    </div>
                </div>

                {/* Right Content - Editable Hero Graphic */}
                <div className="relative w-full aspect-[4/5] lg:aspect-square flex justify-center items-center group perspective-1000 mt-8 lg:mt-0">
                    <div className="absolute inset-4 bg-brand-purple/20 rounded-[3rem] blur-3xl transform group-hover:scale-105 transition-transform duration-700" />

                    {/* The editable hero image placeholder */}
                    <EditableImage
                        id="landing-hero-main"
                        alt="KandyDrops Experience Showcase"
                        defaultSrc="/placeholder-drop-1.jpg" // Will fall back to whatever default img exists, admin can change to gif/image
                        className="w-full h-full rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden transform rotate-2 group-hover:rotate-0 transition-all duration-500 z-10 block"
                        fill
                        priority
                        sizes="(max-width: 768px) 100vw, 50vw"
                    />

                    {/* Decorative floating elements */}
                    <EditableImage
                        id="landing-hero-float-1"
                        alt="Creator Jessi Ray"
                        defaultSrc="/placeholder-drop-2.jpg"
                        className="absolute -left-6 bottom-12 w-32 h-40 rounded-2xl border border-white/20 shadow-2xl z-20 transform -rotate-6 group-hover:-translate-y-4 group-hover:-translate-x-2 transition-transform duration-700"
                    />

                    <EditableImage
                        id="landing-hero-float-2"
                        alt="Creator Bloomytrip"
                        defaultSrc="/placeholder-drop-3.jpg"
                        className="absolute -right-4 top-20 w-36 h-36 rounded-[2rem] border border-white/20 shadow-2xl z-20 transform rotate-12 group-hover:-translate-y-6 group-hover:translate-x-4 transition-transform duration-700"
                    />
                </div>
            </div>
        </section>
    );
}

function ActivityTicker() {
    const [platformCount, setPlatformCount] = useState(0);

    useEffect(() => {
        // Hydrate only on client so the server doesn't mismatch CST timezone
        setPlatformCount(getSimulatedPlatformUnwrapsToday());

        // Update every 5 minutes just in case they leave it open
        const interval = setInterval(() => {
            setPlatformCount(getSimulatedPlatformUnwrapsToday());
        }, 300000);

        return () => clearInterval(interval);
    }, []);

    if (!platformCount) return null;

    return (
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 shadow-lg backdrop-blur-md">
            <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </div>
            <span className="text-sm font-semibold text-white/90">
                🚀 <span className="text-white font-bold">{platformCount.toLocaleString()}</span> users are unwrapping drops right now
            </span>
        </div>
    );
}
