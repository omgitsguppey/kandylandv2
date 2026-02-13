"use client";

import { motion } from "framer-motion";
import { Sparkles, Star } from "lucide-react";
import Link from "next/link";

export default function ExperiencesPage() {
    return (
        <main className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="mb-8 relative"
            >
                <div className="absolute inset-0 bg-brand-pink/20 blur-3xl rounded-full" />
                <div className="w-24 h-24 bg-brand-pink/10 border border-brand-pink/30 rounded-3xl flex items-center justify-center relative z-10 mx-auto shadow-[0_0_50px_rgba(236,72,153,0.3)]">
                    <Sparkles className="w-12 h-12 text-brand-pink" />
                </div>
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tighter"
            >
                Exclusive <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-pink to-brand-purple">Experiences</span>
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-gray-400 max-w-md mx-auto mb-10 text-lg"
            >
                Get ready for immersive events, VIP access, and interactive moments. The candy shop is expanding.
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <Link
                    href="/"
                    className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
                >
                    Back to Home
                </Link>
            </motion.div>
        </main>
    );
}
