"use client";

import { useEffect, useState } from "react";
import { ThumbsDown, ThumbsUp, X } from "lucide-react";

import { trackEvent } from "@/lib/telemetry";
import {
  computeSatisfactionScore,
  SATISFACTION_PROMPT_COOLDOWN_DAYS,
  shouldPromptForContentSatisfaction,
  type SatisfactionEventName,
} from "@/lib/behavioral/satisfaction-score";

const STORAGE_KEY = "kandydrops.content_satisfaction_prompt.v1";
const GLOBAL_PROMPT_COOLDOWN_MS = 2 * 60 * 60 * 1000;

type StoredPromptState = {
  globalLastPromptAtMs?: number;
  byContentKey?: Record<string, number>;
};

type ContentSatisfactionPromptProps = {
  dropId: string;
  creatorId?: string;
  category?: string;
  assetKey?: string;
  mediaIndex?: number;
  mediaType?: string;
  viewerSessionId?: string;
  recommendationId?: string;
  recommendationReason?: string;
  meaningfulConsumptionKey?: string | null;
  completionQuality?: number;
  repeatCreatorInterest?: number;
  lowRefundRisk?: number;
  className?: string;
};

function readStoredPromptState(): StoredPromptState {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as StoredPromptState : {};
  } catch {
    return {};
  }
}

function writeStoredPromptState(nextState: StoredPromptState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    // Satisfaction prompts must never block content consumption.
  }
}

function buildContentKey(input: ContentSatisfactionPromptProps) {
  return [
    input.dropId,
    input.assetKey || "asset",
    input.mediaIndex ?? 0,
  ].join(":");
}

export function ContentSatisfactionPrompt({
  dropId,
  creatorId = "",
  category = "",
  assetKey = "",
  mediaIndex = 0,
  mediaType = "unknown",
  viewerSessionId = "",
  recommendationId = "",
  recommendationReason = "",
  meaningfulConsumptionKey,
  completionQuality = 0,
  repeatCreatorInterest = 0,
  lowRefundRisk = 1,
  className = "",
}: ContentSatisfactionPromptProps) {
  const [visible, setVisible] = useState(false);
  const [reasonFeedbackVisible, setReasonFeedbackVisible] = useState(Boolean(recommendationReason));
  const [contentKey, setContentKey] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- Prompt visibility is a local state machine derived from cooldown storage and consumption inputs. */
  useEffect(() => {
    if (!meaningfulConsumptionKey || !dropId) {
      setVisible(false);
      return;
    }

    const nowMs = Date.now();
    const nextContentKey = buildContentKey({ dropId, assetKey, mediaIndex });
    const stored = readStoredPromptState();
    const globalLastPromptAtMs = stored.globalLastPromptAtMs || 0;
    const lastPromptAtMs = stored.byContentKey?.[nextContentKey] || 0;
    const globalReady = nowMs - globalLastPromptAtMs >= GLOBAL_PROMPT_COOLDOWN_MS;
    const contentReady = shouldPromptForContentSatisfaction({
      meaningfulConsumption: true,
      completionQuality,
      lastPromptAtMs,
      nowMs,
      cooldownDays: SATISFACTION_PROMPT_COOLDOWN_DAYS,
    });

    setContentKey(nextContentKey);
    setVisible(globalReady && contentReady);
    setReasonFeedbackVisible(Boolean(recommendationReason));
  }, [assetKey, completionQuality, dropId, mediaIndex, meaningfulConsumptionKey, recommendationReason]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const markPromptSeen = () => {
    const nowMs = Date.now();
    const stored = readStoredPromptState();
    writeStoredPromptState({
      globalLastPromptAtMs: nowMs,
      byContentKey: {
        ...(stored.byContentKey || {}),
        [contentKey || buildContentKey({ dropId, assetKey, mediaIndex })]: nowMs,
      },
    });
  };

  const trackSatisfaction = (eventName: SatisfactionEventName, explicitRating: number) => {
    const result = computeSatisfactionScore({
      explicitRating,
      completionQuality,
      repeatCreatorInterest,
      feedbackRecency: 1,
      lowRefundRisk,
    });

    trackEvent(eventName, {
      drop_id: dropId,
      creator_id: creatorId,
      drop_category: category,
      asset_key: assetKey || `${dropId}:${mediaIndex}`,
      media_index: mediaIndex,
      media_type: mediaType,
      viewer_session_id: viewerSessionId,
      recommendation_id: recommendationId,
      source_component: "content_satisfaction_prompt",
      source_truth: "client",
      explicit_rating: result.components.explicitRating,
      completion_quality: result.components.completionQuality,
      repeat_creator_interest: result.components.repeatCreatorInterest,
      feedback_recency: result.components.feedbackRecency,
      low_refund_risk: result.components.lowRefundRisk,
      satisfaction_score: result.satisfactionScore,
      satisfaction_label: result.label,
      suppression_score: result.suppressionScore,
      include_in_user_behavior: true,
    });

    markPromptSeen();
    setVisible(false);
  };

  const trackReasonFeedback = (eventName: "recommendation_reason_helpful" | "recommendation_reason_not_helpful") => {
    trackEvent(eventName, {
      drop_id: dropId,
      creator_id: creatorId,
      drop_category: category,
      recommendation_id: recommendationId,
      recommendation_reason: recommendationReason,
      source_component: "content_satisfaction_prompt",
      source_truth: "client",
      include_in_user_behavior: true,
    });
    setReasonFeedbackVisible(false);
  };

  if (!visible && !reasonFeedbackVisible) {
    return null;
  }

  return (
    <aside
      className={`fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-40 mx-auto max-w-sm rounded-3xl border border-white/10 bg-black/80 p-3 text-white shadow-2xl shadow-black/40 backdrop-blur-xl ${className}`}
      aria-live="polite"
      data-satisfaction-prompt="content-consumption"
      data-satisfaction-media-type={mediaType}
    >
      {visible && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold">How was this Drop?</p>
              <p className="mt-1 text-xs leading-relaxed text-white/60">Your feedback helps tune future recommendations.</p>
            </div>
            <button
              type="button"
              onClick={() => trackSatisfaction("content_satisfaction_skipped", 0.5)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/15 hover:text-white"
              aria-label="Skip satisfaction feedback"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => trackSatisfaction("content_satisfaction_positive", 1)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-sm font-bold text-black transition hover:bg-white/90"
            >
              <ThumbsUp className="h-4 w-4" />
              Loved it
            </button>
            <button
              type="button"
              onClick={() => trackSatisfaction("content_satisfaction_negative", 0)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/15"
            >
              <ThumbsDown className="h-4 w-4" />
              Not for me
            </button>
          </div>
        </div>
      )}

      {reasonFeedbackVisible && (
        <div className={visible ? "mt-3 border-t border-white/10 pt-3" : "space-y-3"}>
          <p className="text-xs font-semibold text-white/75">Was this recommendation reason helpful?</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => trackReasonFeedback("recommendation_reason_helpful")}
              className="min-h-11 rounded-2xl bg-brand-purple/80 px-3 text-xs font-bold text-white transition hover:bg-brand-purple"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => trackReasonFeedback("recommendation_reason_not_helpful")}
              className="min-h-11 rounded-2xl bg-white/10 px-3 text-xs font-bold text-white transition hover:bg-white/15"
            >
              Not really
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
