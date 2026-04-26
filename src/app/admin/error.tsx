"use client";

import { useEffect } from "react";
import { CopyX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { reportClientIssue } from "@/lib/client-error-reporting";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientIssue({
      channel: "error",
      severity: "error",
      message: "Admin layout error boundary triggered",
      error,
      detail: { digest: error.digest },
      consoleLabel: "Admin layout error:",
    });
  }, [error]);

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center space-y-4 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-purple/10 text-brand-purple">
        <CopyX className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-white md:text-2xl">Dashboard Data Error</h2>
      <p className="max-w-md text-sm text-gray-400">
        We encountered an error loading real-time dashboard analytics. This might be due to a temporary API timeout or sync issue.
      </p>
      <p className="text-xs font-mono text-gray-500 bg-black/50 p-2 rounded-md">
        {error.message || "Unknown Application Error"}
      </p>
      <div className="flex gap-4">
        <Button variant="brand" onClick={() => reset()}>
          Try Again
        </Button>
      </div>
    </div>
  );
}
