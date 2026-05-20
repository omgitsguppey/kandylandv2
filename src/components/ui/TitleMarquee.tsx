"use client";

import { MarqueeText } from "@/components/ui/MarqueeText";

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
    return (
        <MarqueeText
            as="p"
            title={title}
            delaySeed={delaySeed}
            className={className}
            speed="public-beta-fast"
            ariaLabel={title}
        />
    );
}
