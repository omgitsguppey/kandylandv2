"use client";

import type { HumanApiErrorPayload, HumanErrorAction, HumanErrorDescriptor } from "@/lib/errors/error-language";
import { cn } from "@/lib/utils";

type HumanErrorNoticeProps = {
  descriptor?: HumanErrorDescriptor;
  payload?: HumanApiErrorPayload;
  onPrimaryAction?: (action: HumanErrorAction) => void;
  onSecondaryAction?: (action: HumanErrorAction) => void;
  onSubmitBug?: () => void;
  compact?: boolean;
  className?: string;
};

const ACTION_LABELS: Record<HumanErrorAction, string> = {
  retry: "Try again",
  go_back: "Go back",
  open_wallet: "Add paid GD",
  open_drops: "Open Drops",
  open_creator_dashboard: "Open Creator Dashboard",
  sign_in: "Sign in",
  choose_another_slot: "Pick another slot",
  refresh: "Refresh",
  submit_bug: "Send bug",
  contact_support: "Contact support",
  none: "",
};

function readNoticeCopy(descriptor?: HumanErrorDescriptor, payload?: HumanApiErrorPayload) {
  if (payload) {
    return {
      errorKey: payload.errorKey,
      surface: payload.surface,
      userTitle: payload.userTitle,
      userMessage: payload.userMessage,
      primaryAction: payload.primaryAction,
      secondaryAction: payload.secondaryAction,
      bugReportEligible: payload.bugReportEligible,
      rewardEligible: payload.rewardEligible,
    };
  }

  if (descriptor) {
    return {
      errorKey: descriptor.errorKey,
      surface: descriptor.surface,
      userTitle: descriptor.userTitle,
      userMessage: descriptor.userMessage,
      primaryAction: descriptor.primaryAction,
      secondaryAction: descriptor.secondaryAction,
      bugReportEligible: descriptor.bugReportEligible,
      rewardEligible: descriptor.rewardEligible,
    };
  }

  return null;
}

export function HumanErrorNotice({
  descriptor,
  payload,
  onPrimaryAction,
  onSecondaryAction,
  onSubmitBug,
  compact = false,
  className,
}: HumanErrorNoticeProps) {
  const notice = readNoticeCopy(descriptor, payload);
  if (!notice) {
    return null;
  }

  const primaryLabel = ACTION_LABELS[notice.primaryAction];
  const secondaryLabel = notice.secondaryAction ? ACTION_LABELS[notice.secondaryAction] : "";
  const showPrimary = notice.primaryAction !== "none" && primaryLabel.length > 0;
  const showSecondary = Boolean(notice.secondaryAction && notice.secondaryAction !== "none" && secondaryLabel.length > 0);
  const primaryIsBug = notice.primaryAction === "submit_bug";

  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border border-red-400/20 bg-red-500/10 text-red-50",
        compact ? "p-3" : "p-4",
        className,
      )}
      data-human-error-key={notice.errorKey}
      data-human-error-surface={notice.surface}
      data-bug-report-eligible={notice.bugReportEligible ? "true" : "false"}
      data-reward-eligible={notice.rewardEligible ? "true" : "false"}
    >
      <p className={cn("font-bold text-white", compact ? "text-sm" : "text-base")}>{notice.userTitle}</p>
      <p className={cn("mt-1 leading-6 text-red-100", compact ? "text-xs" : "text-sm")}>{notice.userMessage}</p>
      {showPrimary || showSecondary || notice.bugReportEligible ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {showPrimary ? (
            <button
              type="button"
              onClick={() => primaryIsBug ? onSubmitBug?.() : onPrimaryAction?.(notice.primaryAction)}
              className="min-h-10 rounded-full bg-white px-3 py-2 text-xs font-bold text-black"
            >
              {primaryLabel}
            </button>
          ) : null}
          {showSecondary ? (
            <button
              type="button"
              onClick={() => notice.secondaryAction ? onSecondaryAction?.(notice.secondaryAction) : undefined}
              className="min-h-10 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white"
            >
              {secondaryLabel}
            </button>
          ) : null}
          {notice.bugReportEligible && !primaryIsBug ? (
            <button
              type="button"
              onClick={onSubmitBug}
              className="min-h-10 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white"
            >
              Send bug
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
