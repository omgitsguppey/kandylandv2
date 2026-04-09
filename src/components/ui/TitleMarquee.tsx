"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TitleMarqueeProps {
    title: string;
    delaySeed: number;
    className?: string;
}

export function TitleMarquee({
    title,
    delaySeed,
    className,
}: TitleMarqueeProps) {
    const frameRef = useRef<HTMLDivElement | null>(null);
    const textRef = useRef<HTMLParagraphElement | null>(null);
    const [overflowPx, setOverflowPx] = useState(0);

    const marqueeStyle = overflowPx > 0 ? ({
        ["--title-shift" as string]: `-${overflowPx}px`,
        animationDelay: `${delaySeed * 1.15}s`,
    } satisfies CSSProperties) : undefined;

    useEffect(() => {
        const measure = () => {
            const frame = frameRef.current;
            const text = textRef.current;
            if (!frame || !text) {
                return;
            }

            const nextOverflow = Math.ceil(text.scrollWidth - frame.clientWidth);
            setOverflowPx(nextOverflow > 20 ? nextOverflow : 0);
        };

        measure();

        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", measure);
            return () => window.removeEventListener("resize", measure);
        }

        const observer = new ResizeObserver(() => measure());
        if (frameRef.current) {
            observer.observe(frameRef.current);
        }
        if (textRef.current) {
            observer.observe(textRef.current);
        }

        return () => observer.disconnect();
    }, [title]);

    return (
        <div ref={frameRef} className="overflow-hidden relative">
            <p
                ref={textRef}
                className={cn(
                    "block whitespace-nowrap",
                    overflowPx > 0 ? "title-marquee-active" : "truncate",
                    className,
                )}
                style={marqueeStyle}
            >
                {title}
            </p>
        </div>
    );
}
