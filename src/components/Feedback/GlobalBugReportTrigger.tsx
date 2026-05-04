"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";

import { useRolloutVariant } from "@/context/RolloutContext";
import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import { USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET } from "@/lib/user-mobile-shell";

const HIDDEN_PATH_PREFIXES = ["/offline", "/banned", "/dashboard/chat"];

export function GlobalBugReportTrigger() {
  const pathname = usePathname();
  const entryVariant = useRolloutVariant("bug_report_entrypoint", "icon");

  if (!pathname || HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-[var(--user-mobile-floating-control-bottom-offset)] left-3 z-40 md:bottom-7 md:left-5"
      data-device-layout-surface="floating-bug-report-control"
      style={{
        "--user-mobile-floating-control-bottom-offset": USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET,
      } as CSSProperties}
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
