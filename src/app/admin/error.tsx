"use client";

import { useEffect } from "react";
import { CopyX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const safeError = sanitizeErrorForUser(error, "admin_debug", "internal_server_error");

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
      <h2 className="text-xl font-bold text-white md:text-2xl">Dashboard Runtime Error</h2>
      <p className="max-w-md text-sm text-gray-400">
        The admin dashboard failed to render. Retry the route and inspect debug diagnostics if it fails again.
      </p>
      <p className="max-w-md text-xs text-gray-500" data-admin-error-safe-message="true">
        {safeError.operatorMessage}
      </p>
      <p className="text-xs font-mono text-gray-500 bg-black/50 p-2 rounded-md" data-admin-error-digest="true">
        {error.digest ? `Debug digest: ${error.digest}` : "Debug digest unavailable"}
      </p>
      <div className="flex gap-4">
        <Button variant="brand" onClick={() => reset()}>
          Try Again
        </Button>
      </div>
    </div>
  );
}
