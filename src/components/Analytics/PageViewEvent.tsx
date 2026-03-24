"use client";

import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/telemetry";

export function PageViewEvent({
    eventName,
    eventParams,
}: {
    eventName: string;
    eventParams?: Record<string, string | number | boolean>;
}) {
    const trackedRef = useRef(false);

    useEffect(() => {
        if (trackedRef.current) {
            return;
        }

        trackedRef.current = true;
        trackEvent(eventName, eventParams);
    }, [eventName, eventParams]);

    return null;
}
