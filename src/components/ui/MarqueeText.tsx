"use client";

import {
    type CSSProperties,
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from "react";

import { cn } from "@/lib/utils";

type MarqueeTextElement = "span" | "p" | "h2" | "h3" | "div";
type MarqueeTextSpeed = "public-beta-fast" | "standard" | number;

export interface MarqueeTextProps {
    title?: string;
    children?: ReactNode;
    className?: string;
    speed?: MarqueeTextSpeed;
    onlyWhenTruncated?: boolean;
    respectReducedMotion?: boolean;
    ariaLabel?: string;
    pauseOnHover?: boolean;
    delaySeed?: number;
    as?: MarqueeTextElement;
}

function durationForSpeed(speed: MarqueeTextSpeed | undefined) {
    if (typeof speed === "number" && Number.isFinite(speed) && speed > 0) {
        return `${speed}s`;
    }
    if (speed === "standard") {
        return "14s";
    }
    return "11.67s";
}

export function MarqueeText({
    title,
    children,
    className,
    speed = "public-beta-fast",
    onlyWhenTruncated = true,
    respectReducedMotion = true,
    ariaLabel,
    pauseOnHover = false,
    delaySeed = 0,
    as = "span",
}: MarqueeTextProps) {
    const frameRef = useRef<HTMLDivElement | null>(null);
    const textRef = useRef<HTMLElement | null>(null);
    const overflowRef = useRef(0);
    const [overflowPx, setOverflowPx] = useState(0);
    const Component = as;
    const content = children ?? title ?? "";
    const hasMarquee = overflowPx > 0 || !onlyWhenTruncated;
    const setTextRef = (node: HTMLElement | null) => {
        textRef.current = node;
    };

    const marqueeStyle = hasMarquee ? ({
        ["--title-shift" as string]: `-${overflowPx}px`,
        ["--title-marquee-duration" as string]: durationForSpeed(speed),
        animationDelay: `${delaySeed * 0.75}s`,
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
    }, [content, onlyWhenTruncated]);

    return (
        <div
            ref={frameRef}
            className={cn("relative min-w-0 max-w-full overflow-hidden", pauseOnHover && "title-marquee-paused")}
            data-title-marquee-speed={speed === "public-beta-fast" ? "public-beta-fast" : "standard"}
            data-title-marquee-shared="true"
            data-title-marquee-reduced-motion={respectReducedMotion ? "respected" : "off"}
        >
            <Component
                ref={setTextRef}
                aria-label={ariaLabel}
                className={cn(
                    "block max-w-full whitespace-nowrap",
                    hasMarquee ? "title-marquee-active" : "truncate",
                    className,
                )}
                style={marqueeStyle}
            >
                {content}
            </Component>
        </div>
    );
}
