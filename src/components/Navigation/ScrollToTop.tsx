"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUp } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET } from "@/lib/user-mobile-shell";

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
                    className="fixed bottom-[var(--user-mobile-floating-control-bottom-offset)] right-3 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/75 text-white shadow-2xl shadow-black/45 backdrop-blur-xl transition-all hover:border-brand-purple/35 hover:bg-black active:scale-90 md:bottom-7 md:right-5"
                    data-device-layout-surface="floating-scroll-control"
                    style={{
                        "--user-mobile-floating-control-bottom-offset": USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET,
                    } as CSSProperties}
                    aria-label="Scroll to top"
                    title="Scroll to top"
                >
                    <ArrowUp className="w-5 h-5" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
