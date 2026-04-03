"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { CLIENT_RUNTIME_EVENTS, dispatchClientRuntimeEvent } from "@/hooks/client-runtime";
import { enableBrowserNotifications } from "@/lib/browser-notification-enrollment";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { trackEvent } from "@/lib/telemetry";
import type { TaskGuidanceActionType } from "@/lib/task-guidance";

interface ExecuteTaskGuidanceActionOptions {
  source: "daily_tasks" | "task_guidance";
  onOpenFeedback?: () => void;
}

export function useTaskGuidanceActions() {
  const { user, userProfile } = useAuth();
  const { openPurchaseModal } = useUI();

  const executeTaskGuidanceAction = useCallback(async (
    actionType: TaskGuidanceActionType,
    options: ExecuteTaskGuidanceActionOptions,
  ) => {
    switch (actionType) {
      case "open_notifications":
        dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.openNotifications);
        return true;
      case "open_wallet":
        openPurchaseModal();
        return true;
      case "enable_notifications":
        if (!user || !userProfile) {
          return false;
        }

        try {
          const result = await enableBrowserNotifications(userProfile);
          if (result.status === "not_granted") {
            if (result.needsStandaloneInstall) {
              toast.info("Add KandyDrops to your Home Screen, then reopen it there to enable notifications on iPhone.");
            } else {
              toast.info("Browser notifications were not enabled.");
            }
            return true;
          }

          if (result.status === "failed") {
            throw new Error(result.message);
          }

          trackEvent("task_notifications_enabled", {
            source: options.source,
            messaging_supported: result.messagingSupported,
          });
          toast.success("Notifications enabled.");
          return true;
        } catch (error) {
          reportClientIssue({
            channel: "notifications",
            message: "Task guidance notification enable failed",
            error,
            detail: {
              source: options.source,
              actionType,
            },
            consoleLabel: "[TaskGuidance] enable notifications failed",
          });
          toast.error("We could not enable notifications right now.");
          return true;
        }
      case "give_feedback":
        if (!options.onOpenFeedback) {
          return false;
        }

        trackEvent("feedback_modal_opened", {
          source: options.source,
        });
        options.onOpenFeedback();
        return true;
      default:
        return false;
    }
  }, [openPurchaseModal, user, userProfile]);

  return {
    executeTaskGuidanceAction,
  };
}
