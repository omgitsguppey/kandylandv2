"use client";

import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/telemetry";

export interface PageViewEventProps {
    eventName: string;
    eventParams?: Record<string, string | number | boolean>;
    ready?: boolean;
    visitKey?: string;
    actor?: { id: string | null; loading: boolean };
}

/** One fact per mounted visit, or per resolved actor transition when supplied. */
export function usePageViewEvent({ eventName, eventParams, ready = true, visitKey, actor }: PageViewEventProps) {
    const visitRef = useRef({ defaultTracked: false, defaultKey: undefined as string | undefined, actorKey: null as string | null });
    const actorAware = actor !== undefined;
    const actorId = actor?.id ?? null;
    const actorLoading = actor?.loading ?? false;

    useEffect(() => {
        if (actorAware) {
            // Unresolved auth is not logout; a profile gap does not end the visit.
            if (actorLoading) return;
            if (!actorId) {
                visitRef.current.actorKey = null;
                return;
            }
            const actorKey = JSON.stringify([actorId, visitKey ?? null]);
            if (!ready || visitRef.current.actorKey === actorKey) return;
            visitRef.current.actorKey = actorKey;
        } else {
            if (!ready || (visitRef.current.defaultTracked && visitRef.current.defaultKey === visitKey)) return;
            visitRef.current.defaultTracked = true;
            visitRef.current.defaultKey = visitKey;
        }

        trackEvent(eventName, eventParams);
    }, [actorAware, actorId, actorLoading, eventName, eventParams, ready, visitKey]);
}

export function PageViewEvent(props: PageViewEventProps) {
    usePageViewEvent(props);
    return null;
}
