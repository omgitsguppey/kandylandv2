"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

export function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);
    const rafIdRef = useRef<number | null>(null);
    const visibleRef = useRef(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (rafIdRef.current !== null) {
                return;
            }

            rafIdRef.current = window.requestAnimationFrame(() => {
                rafIdRef.current = null;
                const nextVisible = window.pageYOffset > 300;
                if (visibleRef.current !== nextVisible) {
                    visibleRef.current = nextVisible;
                    setIsVisible(nextVisible);
                }
            });
        };

        toggleVisibility();
        window.addEventListener("scroll", toggleVisibility, { passive: true });
        return () => {
            window.removeEventListener("scroll", toggleVisibility);
            if (rafIdRef.current !== null) {
                window.cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    onClick={scrollToTop}
                    className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-3 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/75 text-white shadow-2xl shadow-black/45 backdrop-blur-xl transition-all hover:border-brand-purple/35 hover:bg-black active:scale-90 md:bottom-7 md:right-5"
                    aria-label="Scroll to top"
                    title="Scroll to top"
                >
                    <ArrowUp className="w-5 h-5" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
