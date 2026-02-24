"use client";

import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { useEffect, useState, useRef } from "react";

interface AnimateBalanceProps {
    balance: number;
    className?: string;
}

export function AnimateBalance({ balance, className }: AnimateBalanceProps) {
    const [isIncreased, setIsIncreased] = useState(false);
    const [isDecreased, setIsDecreased] = useState(false);
    const prevBalanceRef = useRef(balance);

    // Use framer-motion's spring for smooth, un-interruptable number interpolation
    const springValue = useSpring(balance, {
        stiffness: 100,
        damping: 30,
        mass: 1
    });

    const displayBalance = useTransform(springValue, (current) => Math.floor(current));

    useEffect(() => {
        // Trigger the spring animation
        springValue.set(balance);

        // Handle the +/- badges
        if (balance > prevBalanceRef.current) {
            setIsIncreased(true);
            const timeout = setTimeout(() => setIsIncreased(false), 2000);
            prevBalanceRef.current = balance;
            return () => clearTimeout(timeout);
        } else if (balance < prevBalanceRef.current) {
            setIsDecreased(true);
            const timeout = setTimeout(() => setIsDecreased(false), 2000);
            prevBalanceRef.current = balance;
            return () => clearTimeout(timeout);
        }
    }, [balance, springValue]);

    return (
        <span className={className}>
            <motion.span>{displayBalance}</motion.span>

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
