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
    const overflowRef = useRef(0);
    const [overflowPx, setOverflowPx] = useState(0);

    const marqueeStyle = overflowPx > 0 ? ({
        ["--title-shift" as string]: `-${overflowPx}px`,
        animationDelay: `${delaySeed * 1.15}s`,
    } satisfies CSSProperties) : undefined;

    useEffect(() => {
        let frameId: number | null = null;
        const measure = () => {
            const frame = frameRef.current;
            const text = textRef.current;
            if (!frame || !text) {
                return;
            }

            const nextOverflow = Math.ceil(text.scrollWidth - frame.clientWidth);
            const normalizedOverflow = nextOverflow > 20 ? nextOverflow : 0;
            if (overflowRef.current !== normalizedOverflow) {
                overflowRef.current = normalizedOverflow;
                setOverflowPx(normalizedOverflow);
            }
        };
        const scheduleMeasure = () => {
            if (frameId !== null) {
                return;
            }

            frameId = window.requestAnimationFrame(() => {
                frameId = null;
                measure();
            });
        };

        scheduleMeasure();

        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", scheduleMeasure);
            return () => {
                if (frameId !== null) {
                    window.cancelAnimationFrame(frameId);
                }
                window.removeEventListener("resize", scheduleMeasure);
            };
        }

        const observer = new ResizeObserver(() => scheduleMeasure());
        if (frameRef.current) {
            observer.observe(frameRef.current);
        }

        return () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            observer.disconnect();
        };
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
