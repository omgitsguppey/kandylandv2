"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";
import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import { recordClientError } from "@/lib/client-diagnostics";
import { getPageProblemCopy } from "@/lib/problem-state-copy";


export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const problemCopy = getPageProblemCopy(error);

    useEffect(() => {
        recordClientError(error, { source: "app_error_boundary" });
    }, [error]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="mb-4 text-2xl font-bold text-white">{problemCopy.headline}</h2>
            <p className="text-gray-400 max-w-md mb-4">
                {problemCopy.body}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="glass" onClick={() => window.location.reload()}>
                    {problemCopy.actionLabel}
                </Button>
                <Button variant="brand" onClick={() => reset()}>
                    Try Again
                </Button>
                <div className="flex items-center justify-center">
                    <ReportBugButton context="error-boundary" label="Report this issue" variant="pill" />
                </div>
            </div>
        </div>
    );
}
