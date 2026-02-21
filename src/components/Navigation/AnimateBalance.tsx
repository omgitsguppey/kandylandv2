"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

interface AnimateBalanceProps {
    balance: number;
    className?: string;
}

export function AnimateBalance({ balance, className }: AnimateBalanceProps) {
    const [displayBalance, setDisplayBalance] = useState(balance);
    const [isIncreased, setIsIncreased] = useState(false);
    const [isDecreased, setIsDecreased] = useState(false);
    const prevBalanceRef = useRef(balance);

    useEffect(() => {
        if (balance > prevBalanceRef.current) {
            setIsIncreased(true);
            setTimeout(() => setIsIncreased(false), 2000);
        } else if (balance < prevBalanceRef.current) {
            setIsDecreased(true);
            setTimeout(() => setIsDecreased(false), 2000);
        }

        // Count animation
        const start = displayBalance;
        const end = balance;
        if (start === end) return;

        const duration = 500;
        const startTime = performance.now();
        let animationFrameId: number;

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out quad
            const easedProgress = progress * (2 - progress);
            const nextValue = Math.floor(start + (end - start) * easedProgress);

            setDisplayBalance(nextValue);

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                setDisplayBalance(end);
                prevBalanceRef.current = end;
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        // Cleanup: cancel the animation frame if the effect re-runs or unmounts
        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [balance]);

    return (
        <span className={className}>
            <AnimatePresence mode="wait">
                <motion.span
                    key={displayBalance}
                    initial={{ y: isIncreased ? -10 : isDecreased ? 10 : 0, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: isIncreased ? 10 : isDecreased ? -10 : 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {displayBalance}
                </motion.span>
            </AnimatePresence>

            <AnimatePresence>
                {isIncreased && (
                    <motion.span
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: 1, y: -20 }}
                        exit={{ opacity: 0 }}
                        className="absolute -top-1 right-0 text-brand-green text-[10px] font-bold"
                    >
                        +{balance - prevBalanceRef.current}
                    </motion.span>
                )}
                {isDecreased && (
                    <motion.span
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: 1, y: 20 }}
                        exit={{ opacity: 0 }}
                        className="absolute -bottom-1 right-0 text-red-500 text-[10px] font-bold"
                    >
                        {balance - prevBalanceRef.current}
                    </motion.span>
                )}
            </AnimatePresence>
        </span>
    );
}
