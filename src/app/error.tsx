"use client";

import { useEffect } from "react";
import { recordClientError } from "@/lib/client-diagnostics";
import { getPageProblemCopy } from "@/lib/problem-state-copy";
import { KandyErrorStateSurface } from "@/components/creative-tim/kandydrops/app-states/KandyErrorStateSurface";


export default function Error({
    error,
    retry,
}: {
    error: Error & { digest?: string };
    retry: () => void;
}) {
    const problemCopy = getPageProblemCopy(error);

    useEffect(() => {
        recordClientError(error, { source: "app_error_boundary" });
    }, [error]);

    return (
        <KandyErrorStateSurface
            headline={problemCopy.headline}
            body={problemCopy.body}
            actionLabel={problemCopy.actionLabel}
            onReload={() => window.location.reload()}
            onReset={retry}
        />
    );
}
