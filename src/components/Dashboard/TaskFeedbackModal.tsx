"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/authFetch";
import { trackEvent } from "@/lib/telemetry";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { dispatchActivitySync } from "@/lib/activity-sync";

export type FeedbackCategory = "general" | "feature_request" | "bug_report" | "creator_request";

const FEEDBACK_CATEGORY_OPTIONS: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "general", label: "General idea" },
  { value: "feature_request", label: "Feature request" },
  { value: "bug_report", label: "Bug report" },
  { value: "creator_request", label: "Creator feedback" },
];

export interface TaskFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TaskFeedbackModal({ isOpen, onClose }: TaskFeedbackModalProps) {
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("general");
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const submitFeedback = async () => {
    if (!feedbackMessage.trim()) {
      toast.error("Share a quick note before submitting.");
      return;
    }

    setFeedbackLoading(true);
    try {
      const response = await authFetch("/api/tasks/feedback", {
        method: "POST",
        body: JSON.stringify({
          message: feedbackMessage.trim(),
          category: feedbackCategory,
          rating: feedbackRating,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Feedback failed");
      }

      trackEvent("feedback_submitted", {
        category: feedbackCategory,
        rating: feedbackRating,
        source_component: "daily_tasks_module",
      });

      toast.success("Thanks for the feedback.");
      setFeedbackMessage("");
      setFeedbackRating(5);
      setFeedbackCategory("general");
      dispatchActivitySync();
      onClose();
    } catch (error) {
      reportClientIssue({
        channel: "feedback",
        severity: "error",
        message: "Daily tasks feedback submission failed",
        error,
        detail: {
          component: "DailyTasksModule",
          feedbackCategory,
          feedbackRating,
        },
        consoleLabel: "[DailyTasks] feedback submission failed",
      });
      toast.error(error instanceof Error ? error.message : "Feedback failed");
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/10 p-5">
        <h2 className="text-xl font-bold text-white">Share feedback</h2>
        <p className="mt-1 text-sm leading-6 text-gray-400">Tell us what would make daily tasks more useful.</p>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {FEEDBACK_CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFeedbackCategory(option.value)}
                  aria-pressed={feedbackCategory === option.value}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition-colors",
                    feedbackCategory === option.value
                      ? "border-brand-purple bg-brand-purple/15 text-white"
                      : "border-white/10 bg-white/5 text-gray-300",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setFeedbackRating(rating)}
                  aria-pressed={feedbackRating === rating}
                  aria-label={`Rate ${rating} out of 5 stars`}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-bold transition-colors",
                    feedbackRating === rating
                      ? "border-brand-purple bg-brand-purple text-white"
                      : "border-white/10 bg-white/5 text-gray-300",
                  )}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Message</label>
            <textarea
              value={feedbackMessage}
              onChange={(event) => setFeedbackMessage(event.target.value)}
              className="h-32 w-full rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple"
              placeholder="What should we improve?"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitFeedback}
            disabled={feedbackLoading}
            className="flex-1 rounded-full border border-brand-purple bg-brand-purple px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {feedbackLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Send feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
