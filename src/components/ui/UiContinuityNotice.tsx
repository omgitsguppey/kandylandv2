"use client";

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type UiContinuityNoticeProps = {
  title: string;
  body: string;
  tone: "loading" | "warning" | "success";
  "data-testid"?: string;
};

export function UiContinuityNotice({ title, body, tone, "data-testid": dataTestId }: UiContinuityNoticeProps) {
  const icon = tone === "loading"
    ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
    : tone === "success"
      ? <CheckCircle2 className="h-4 w-4" />
      : <AlertTriangle className="h-4 w-4" />;

  const className = tone === "loading"
    ? "border-white/10 bg-white/5 text-gray-200"
    : tone === "success"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : "border-amber-400/25 bg-amber-500/10 text-amber-100";

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${className}`}
      data-ui-continuity-error={tone === "warning" ? "true" : "false"}
      data-testid={dataTestId}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-xs leading-5 opacity-90">{body}</p>
        </div>
      </div>
    </div>
  );
}
