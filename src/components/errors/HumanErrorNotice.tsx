"use client";

import { useState } from "react";

import { BUG_REPORT_REWARD_GD, type BugReportStatus } from "@/lib/errors/bug-report-contract";
import type { SubmitBugReportResult } from "@/lib/errors/submit-bug-report";
import type { HumanApiErrorPayload, HumanErrorAction, HumanErrorDescriptor } from "@/lib/errors/error-language";
import { cn } from "@/lib/utils";

type HumanErrorNoticeProps = {
  descriptor?: HumanErrorDescriptor;
  payload?: HumanApiErrorPayload;
  onPrimaryAction?: (action: HumanErrorAction) => void;
  onSecondaryAction?: (action: HumanErrorAction) => void;
  onSubmitBug?: () => Promise<SubmitBugReportResult | void> | SubmitBugReportResult | void;
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

function bugReportLabel(rewardEligible: boolean) {
  return rewardEligible ? `Send bug + get ${BUG_REPORT_REWARD_GD} GD` : "Send bug";
}

function bugReportStatusMessage(result?: SubmitBugReportResult | void) {
  if (!result || result.success !== true) {
    return "";
  }

  if (result.rewardGranted) {
    return `${result.rewardGd ?? BUG_REPORT_REWARD_GD} reward GumDrops added.`;
  }

  const status = result.status as BugReportStatus | undefined;
  if (status === "duplicate") {
    return "Bug sent. We already counted this one recently.";
  }
  if (status === "reward_cap_reached") {
    return "Bug sent. Today's bug reward limit is reached.";
  }

  return "Bug sent.";
}

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
  const [bugPending, setBugPending] = useState(false);
  const [bugStatusMessage, setBugStatusMessage] = useState("");
  const [bugErrorMessage, setBugErrorMessage] = useState("");
  const notice = readNoticeCopy(descriptor, payload);
  if (!notice) {
    return null;
  }

  const primaryLabel = ACTION_LABELS[notice.primaryAction];
  const secondaryLabel = notice.secondaryAction ? ACTION_LABELS[notice.secondaryAction] : "";
  const primaryIsBug = notice.primaryAction === "submit_bug";
  const showPrimary = notice.primaryAction !== "none"
    && primaryLabel.length > 0
    && (primaryIsBug ? Boolean(onSubmitBug) : Boolean(onPrimaryAction));
  const showSecondary = Boolean(
    onSecondaryAction
      && notice.secondaryAction
      && notice.secondaryAction !== "none"
      && secondaryLabel.length > 0
      && !(notice.secondaryAction === "submit_bug" && notice.bugReportEligible),
  );
  const showBugReport = Boolean(
    onSubmitBug
      && notice.bugReportEligible,
  );
  const sendBug = async () => {
    if (!onSubmitBug || bugPending) {
      return;
    }

    setBugPending(true);
    setBugStatusMessage("");
    setBugErrorMessage("");
    try {
      const result = await onSubmitBug();
      const nextMessage = bugReportStatusMessage(result);
      if (nextMessage) {
        setBugStatusMessage(nextMessage);
      } else if (result && result.success === false) {
        setBugErrorMessage(result.userMessage ?? result.error ?? "Bug report could not be sent.");
      }
    } catch {
      setBugErrorMessage("Bug report could not be sent. Try again in a moment.");
    } finally {
      setBugPending(false);
    }
  };

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
      {bugStatusMessage ? (
        <p className={cn("mt-2 text-emerald-100", compact ? "text-xs" : "text-sm")}>{bugStatusMessage}</p>
      ) : null}
      {bugErrorMessage ? (
        <p className={cn("mt-2 text-red-100", compact ? "text-xs" : "text-sm")}>{bugErrorMessage}</p>
      ) : null}
      {showPrimary || showSecondary || showBugReport ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {showPrimary ? (
            <button
              type="button"
              onClick={() => primaryIsBug ? void sendBug() : onPrimaryAction?.(notice.primaryAction)}
              disabled={primaryIsBug && bugPending}
              className="min-h-11 rounded-full bg-white px-3 py-2 text-xs font-bold text-black"
            >
              {primaryIsBug ? (bugPending ? "Sending bug..." : bugReportLabel(notice.rewardEligible)) : primaryLabel}
            </button>
          ) : null}
          {showSecondary ? (
            <button
              type="button"
              onClick={() => notice.secondaryAction ? onSecondaryAction?.(notice.secondaryAction) : undefined}
              className="min-h-11 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white"
            >
              {secondaryLabel}
            </button>
          ) : null}
          {showBugReport && !primaryIsBug ? (
            <button
              type="button"
              onClick={() => void sendBug()}
              disabled={bugPending}
              className="min-h-11 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white"
            >
              {bugPending ? "Sending bug..." : bugReportLabel(notice.rewardEligible)}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
