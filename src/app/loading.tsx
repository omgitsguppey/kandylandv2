"use client";

import { motion } from "framer-motion";
import { CandyIcon } from "@/components/ui/Icon";

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-6">
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="relative"
                >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-brand-pink/30 blur-2xl rounded-full scale-150 animate-pulse" />
                    <CandyIcon className="w-20 h-20 text-brand-purple relative z-10 drop-shadow-[0_0_15px_rgba(178,140,255,0.6)]" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center gap-2 text-center"
                >
                    <h2 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                        KandyDrops
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-pink animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
