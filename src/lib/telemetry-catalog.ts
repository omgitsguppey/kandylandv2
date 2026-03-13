export type TelemetryEventCategory =
  | "auth"
  | "notifications"
  | "tasks"
  | "engagement"
  | "commerce"
  | "content"
  | "navigation";

export interface TelemetryEventOption {
  eventName: string;
  label: string;
  category: TelemetryEventCategory;
}

export const TELEMETRY_EVENT_OPTIONS: TelemetryEventOption[] = [
  { eventName: "auth_modal_opened", label: "Auth modal opened", category: "auth" },
  { eventName: "auth_mode_switched", label: "Auth mode switched", category: "auth" },
  { eventName: "auth_google_sign_in_attempted", label: "Google sign-in attempted", category: "auth" },
  { eventName: "auth_google_sign_in_success", label: "Google sign-in success", category: "auth" },
  { eventName: "auth_google_sign_in_failed", label: "Google sign-in failed", category: "auth" },
  { eventName: "auth_sign_in_attempted", label: "Email sign-in attempted", category: "auth" },
  { eventName: "auth_sign_in_success", label: "Email sign-in success", category: "auth" },
  { eventName: "auth_sign_in_failed", label: "Email sign-in failed", category: "auth" },
  { eventName: "auth_sign_up_attempted", label: "Email sign-up attempted", category: "auth" },
  { eventName: "auth_sign_up_success", label: "Email sign-up success", category: "auth" },
  { eventName: "auth_sign_up_failed", label: "Email sign-up failed", category: "auth" },
  { eventName: "password_reset_requested", label: "Password reset requested", category: "auth" },
  { eventName: "password_reset_sent", label: "Password reset sent", category: "auth" },
  { eventName: "password_reset_failed", label: "Password reset failed", category: "auth" },
  { eventName: "guided_onboarding_started", label: "Guided onboarding started", category: "engagement" },
  { eventName: "guided_onboarding_completed", label: "Guided onboarding completed", category: "engagement" },
  { eventName: "home_page_viewed", label: "Home page viewed", category: "engagement" },
  { eventName: "drops_page_viewed", label: "Drops page viewed", category: "engagement" },
  { eventName: "faq_page_viewed", label: "FAQ page viewed", category: "engagement" },
  { eventName: "dashboard_viewed", label: "Dashboard viewed", category: "engagement" },
  { eventName: "library_viewed", label: "Library viewed", category: "engagement" },
  { eventName: "experience_hub_viewed", label: "Experiences viewed", category: "engagement" },
  { eventName: "daily_check_in_claim", label: "Daily check-in claimed", category: "tasks" },
  { eventName: "wallet_opened", label: "Wallet opened", category: "commerce" },
  { eventName: "purchase_package_selected", label: "Wallet package selected", category: "commerce" },
  { eventName: "begin_checkout", label: "Checkout started", category: "commerce" },
  { eventName: "gumdrops_purchase_completed", label: "Gum Drops purchase completed", category: "commerce" },
  { eventName: "gumdrops_purchase_failed", label: "Gum Drops purchase failed", category: "commerce" },
  { eventName: "drop_card_impression", label: "Drop card impression", category: "content" },
  { eventName: "view_drop_details", label: "Drop details viewed", category: "content" },
  { eventName: "drop_preview_opened", label: "Drop preview opened", category: "content" },
  { eventName: "drop_unlock_attempted", label: "Drop unlock attempted", category: "content" },
  { eventName: "unlock_drop_success", label: "Drop unwrapped", category: "content" },
  { eventName: "drop_share_copied", label: "Drop share copied", category: "content" },
  { eventName: "viewer_opened", label: "Viewer opened", category: "content" },
  { eventName: "viewer_session_started", label: "Viewer session started", category: "content" },
  { eventName: "viewer_session_completed", label: "Viewer session completed", category: "content" },
  { eventName: "viewer_asset_started", label: "Viewer asset started", category: "content" },
  { eventName: "viewer_asset_changed", label: "Viewer asset changed", category: "content" },
  { eventName: "viewer_asset_completed", label: "Viewer asset completed", category: "content" },
  { eventName: "viewer_asset_consumed", label: "Viewer asset consumed", category: "content" },
  { eventName: "viewer_watch_checkpoint", label: "Viewer watch checkpoint", category: "content" },
  { eventName: "viewer_content_loaded", label: "Viewer content loaded", category: "content" },
  { eventName: "viewer_source_downloaded", label: "Viewer source downloaded", category: "content" },
  { eventName: "viewer_related_drop_clicked", label: "Viewer related drop clicked", category: "content" },
  { eventName: "notifications_dropdown_opened", label: "Notifications opened", category: "notifications" },
  { eventName: "notification_opened", label: "Notification opened", category: "notifications" },
  { eventName: "notification_marked_read", label: "Notification marked read", category: "notifications" },
  { eventName: "notification_mark_all_read", label: "Notifications marked read", category: "notifications" },
  { eventName: "task_notifications_enabled", label: "Notifications enabled", category: "notifications" },
  { eventName: "notification_prompt_banner_viewed", label: "Notification prompt viewed", category: "notifications" },
  { eventName: "notification_prompt_banner_dismissed", label: "Notification prompt dismissed", category: "notifications" },
  { eventName: "notification_prompt_install_help_opened", label: "Notification install help opened", category: "notifications" },
  { eventName: "feedback_modal_opened", label: "Feedback modal opened", category: "tasks" },
  { eventName: "feedback_submitted", label: "Feedback submitted", category: "tasks" },
  { eventName: "navigation_click", label: "Navigation click", category: "navigation" },
  { eventName: "recent_activity_viewed", label: "Recent activity viewed", category: "engagement" },
  { eventName: "daily_tasks_viewed", label: "Daily tasks viewed", category: "tasks" },
  { eventName: "daily_task_action_clicked", label: "Daily task action clicked", category: "tasks" },
  { eventName: "daily_task_assigned", label: "Daily task assigned", category: "tasks" },
  { eventName: "daily_task_started", label: "Daily task started", category: "tasks" },
  { eventName: "daily_task_completed", label: "Daily task completed", category: "tasks" },
  { eventName: "daily_task_failed", label: "Daily task failed", category: "tasks" },
  { eventName: "daily_task_deadline_reminder_sent", label: "Daily task reminder sent", category: "tasks" },
  { eventName: "daily_deadline_browser_notification_shown", label: "Browser deadline notification shown", category: "notifications" },
];

export const TELEMETRY_EVENT_NAMES = TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName);

export const TELEMETRY_EVENT_LABELS = Object.fromEntries(
  TELEMETRY_EVENT_OPTIONS.map((event) => [event.eventName, event.label]),
) as Record<string, string>;
