"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CompactNumberProps {
    value: number;
    className?: string;
}

export function formatCompactNumber(value: number): string {
    if (value < 1000) return String(Math.floor(value));
    if (value < 1000000) {
        const k = value / 1000;
        return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
    }
    const m = value / 1000000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
}

export function CompactNumber({ value, className }: CompactNumberProps) {
    const [isRevealed, setIsRevealed] = useState(false);
    const holdTimer = useRef<NodeJS.Timeout | null>(null);

    const handlePointerDown = () => {
        holdTimer.current = setTimeout(() => {
            setIsRevealed(true);
        }, 5000);
    };

    const handlePointerUpOrLeave = () => {
        if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
        }
        setIsRevealed(false);
    };

    useEffect(() => {
        return () => {
            if (holdTimer.current) clearTimeout(holdTimer.current);
        };
    }, []);

    const displayValue = isRevealed ? value.toLocaleString() : formatCompactNumber(value);

    return (
        <span
            className={cn("cursor-default select-none", className)}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUpOrLeave}
            onPointerLeave={handlePointerUpOrLeave}
            onPointerCancel={handlePointerUpOrLeave}
        >
            {displayValue}
        </span>
    );
}
