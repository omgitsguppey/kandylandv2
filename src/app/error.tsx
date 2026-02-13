"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-4">Something went wrong!</h2>
            <p className="text-gray-400 max-w-md mb-8">
                We encountered an unexpected issue. Please try refreshing the page.
            </p>

            <div className="flex gap-4">
                <Button variant="glass" onClick={() => window.location.reload()}>
                    Refresh Page
                </Button>
                <Button variant="brand" onClick={() => reset()}>
                    Try Again
                </Button>
            </div>
        </div>
    );
}
