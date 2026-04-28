"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export const CompactNumber = memo(function CompactNumber({ value, className }: CompactNumberProps) {
    const [isRevealed, setIsRevealed] = useState(false);
    const holdTimer = useRef<number | null>(null);

    const handlePointerDown = useCallback(() => {
        if (holdTimer.current) {
            window.clearTimeout(holdTimer.current);
        }
        holdTimer.current = window.setTimeout(() => {
            setIsRevealed(true);
        }, 5000);
    }, []);

    const handlePointerUpOrLeave = useCallback(() => {
        if (holdTimer.current) {
            window.clearTimeout(holdTimer.current);
            holdTimer.current = null;
        }
        setIsRevealed((current) => (current ? false : current));
    }, []);

    useEffect(() => {
        return () => {
            if (holdTimer.current) {
                window.clearTimeout(holdTimer.current);
            }
        };
    }, []);

    const displayValue = useMemo(
        () => (isRevealed ? value.toLocaleString() : formatCompactNumber(value)),
        [isRevealed, value],
    );

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
});
