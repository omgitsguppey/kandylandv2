"use client";

import { useCallback, useState } from "react";

import type { BugReportInput } from "@/lib/errors/bug-report-contract";
import type { HumanErrorDescriptor } from "@/lib/errors/error-language";
import { submitBugReport, type SubmitBugReportResult } from "@/lib/errors/submit-bug-report";

type SubmitOptions = {
  redirect?: boolean;
};

export function useSubmitBugReport() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SubmitBugReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (
    descriptor: HumanErrorDescriptor,
    input: Partial<BugReportInput> = {},
    options: SubmitOptions = {},
  ) => {
    setPending(true);
    setError(null);
    try {
      const nextResult = await submitBugReport({
        errorKey: descriptor.errorKey,
        surface: descriptor.surface,
        userMessage: descriptor.userMessage,
        userTitle: descriptor.userTitle,
        primaryAction: descriptor.primaryAction,
        ...input,
      });

      setResult(nextResult);
      if (!nextResult.success) {
        setError(nextResult.error ?? nextResult.userMessage ?? "Bug report could not be sent.");
      } else if (options.redirect && nextResult.redirectTo) {
        window.location.assign(nextResult.redirectTo);
      }

      return nextResult;
    } finally {
      setPending(false);
    }
  }, []);

  return {
    pending,
    result,
    error,
    submit,
  };
}
