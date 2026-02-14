"use client";

import { useState, useEffect } from "react";

export function DebugBreakpoints() {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (process.env.NODE_ENV !== "development") return;

        function handleResize() {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    if (process.env.NODE_ENV !== "development") return null;

    return (
        <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none flex flex-col gap-1 items-start font-mono text-xs font-bold">
            {/* Pixel Dimensions */}
            <div className="bg-black/80 text-brand-pink px-2 py-1 rounded border border-white/10 backdrop-blur-md shadow-xl">
                {dimensions.width}px <span className="text-gray-500">x</span> {dimensions.height}px
            </div>

            {/* Breakpoint Badge */}
            <div className="bg-black/80 text-brand-cyan px-2 py-1 rounded border border-white/10 backdrop-blur-md shadow-xl">
                <span className="sm:hidden">xs (mobile)</span>
                <span className="hidden sm:block md:hidden">sm (large mobile)</span>
                <span className="hidden md:block lg:hidden">md (tablet)</span>
                <span className="hidden lg:block xl:hidden">lg (desktop)</span>
                <span className="hidden xl:block 2xl:hidden">xl (wide)</span>
                <span className="hidden 2xl:block">2xl (ultra)</span>
            </div>
        </div>
    );
}
