"use client";

import { usePathname } from "next/navigation";

import { useRolloutVariant } from "@/context/RolloutContext";
import { ReportBugButton } from "@/components/Feedback/ReportBugButton";

const HIDDEN_PATH_PREFIXES = ["/offline", "/banned"];

export function GlobalBugReportTrigger() {
  const pathname = usePathname();
  const entryVariant = useRolloutVariant("bug_report_entrypoint", "icon");

  if (!pathname || HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] left-3 z-40 md:bottom-7 md:left-5"
    >
      <ReportBugButton
        context={`global:${pathname}`}
        label={entryVariant === "pill" ? "Report issue" : "Report bug"}
        variant={entryVariant === "pill" ? "floating" : "icon"}
        className="pointer-events-auto"
      />
    </div>
  );
}
