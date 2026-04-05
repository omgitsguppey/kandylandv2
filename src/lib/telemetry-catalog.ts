export type TelemetryEventCategory =
  | "auth"
  | "notifications"
  | "tasks"
  | "engagement"
  | "commerce"
  | "content"
  | "navigation"
  | "admin"
  | "security"
  | "system";

export type TelemetryEventSource =
  | "ga4"
  | "client"
  | "backend"
  | "canonical"
  | "guest";

export type TelemetryModuleKey =
  | "auth"
  | "onboarding"
  | "navigation"
  | "notifications"
  | "tasks"
  | "task_guidance"
  | "commerce"
  | "content"
  | "viewer"
  | "creator"
  | "engagement"
  | "admin"
  | "security"
  | "runtime";

export interface TelemetryEventOption {
  eventName: string;
  label: string;
  category: TelemetryEventCategory;
  sources?: TelemetryEventSource[];
  modules?: TelemetryModuleKey[];
  aliases?: string[];
  auditCoveredBy?: string[];
}

export interface TelemetryModuleIndex {
  key: TelemetryModuleKey;
  label: string;
  eventNames: string[];
  fallbackSources: string[];
}

export interface TelemetryResolvedEventMetadata {
  canonicalEventName: string;
  option?: TelemetryEventOption;
  metadataParams: Record<string, string>;
}

const DEFAULT_CLIENT_SOURCES: TelemetryEventSource[] = ["ga4", "client", "backend"];
const DEFAULT_SERVER_SOURCES: TelemetryEventSource[] = ["ga4", "backend"];
const DEFAULT_CANONICAL_SERVER_SOURCES: TelemetryEventSource[] = ["ga4", "backend", "canonical"];
const DEFAULT_GA_ONLY_SOURCES: TelemetryEventSource[] = ["ga4"];

export const TELEMETRY_EVENT_INDEX_VERSION = "2026.04.04.1";

export const TELEMETRY_EVENT_OPTIONS: TelemetryEventOption[] = [
  { eventName: "auth_modal_opened", label: "Auth modal opened", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "auth_mode_switched", label: "Auth mode switched", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "auth_google_sign_in_attempted", label: "Google sign-in attempted", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "auth_google_sign_in_success", label: "Google sign-in success", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "auth_google_sign_in_failed", label: "Google sign-in failed", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "auth_sign_in_attempted", label: "Email sign-in attempted", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "auth_sign_in_success", label: "Email sign-in success", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "auth_sign_in_failed", label: "Email sign-in failed", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "auth_sign_up_attempted", label: "Email sign-up attempted", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "auth_sign_up_success", label: "Email sign-up success", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "auth_sign_up_failed", label: "Email sign-up failed", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "user_registered", label: "New user registered", category: "auth", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["auth", "onboarding"] },
  { eventName: "auth_session_restored", label: "Persistent session restored", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "auth_logout", label: "Logged out", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "password_reset_requested", label: "Password reset requested", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "password_reset_sent", label: "Password reset sent", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "password_reset_failed", label: "Password reset failed", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  {
    eventName: "guided_onboarding_started",
    label: "Guided onboarding started",
    category: "engagement",
    sources: DEFAULT_CLIENT_SOURCES,
    modules: ["onboarding", "engagement"],
    aliases: ["onboarding_started"],
  },
  {
    eventName: "guided_onboarding_completed",
    label: "Guided onboarding completed",
    category: "engagement",
    sources: DEFAULT_CLIENT_SOURCES,
    modules: ["onboarding", "engagement"],
    aliases: ["onboarding_complete"],
  },
  {
    eventName: "guided_onboarding_step_started",
    label: "Guided onboarding step started",
    category: "engagement",
    sources: DEFAULT_CANONICAL_SERVER_SOURCES,
    modules: ["onboarding", "engagement"],
  },
  {
    eventName: "guided_onboarding_step_completed",
    label: "Guided onboarding step completed",
    category: "engagement",
    sources: DEFAULT_CANONICAL_SERVER_SOURCES,
    modules: ["onboarding", "engagement"],
  },
  { eventName: "onboarding_step_viewed", label: "Onboarding step viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["onboarding"] },
  { eventName: "avatar_uploaded", label: "Avatar uploaded", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["onboarding"] },
  { eventName: "home_page_viewed", label: "Home page viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "creator_apply_viewed", label: "Creator apply page viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "engagement", "navigation"] },
  { eventName: "creator_waitlist_viewed", label: "Creator waitlist page viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "engagement", "navigation"] },
  { eventName: "creator_onboarding_submitted", label: "Creator onboarding submitted", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_intro_acknowledged", label: "Creator intro acknowledged", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_legally_cleared_override", label: "Creator legally cleared override", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_admin_queue_materialized", label: "Creator admin queue materialized", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_id_requested", label: "Creator ID requested", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_id_document_uploaded", label: "Creator ID document uploaded", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_id_submitted", label: "Creator ID submitted", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_id_submission_failed", label: "Creator ID submission failed", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_id_verified", label: "Creator ID verified", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_id_rejected", label: "Creator ID rejected", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_legal_sent", label: "Creator legal sent", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_contract_signed", label: "Creator contract signed", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_legal_signed", label: "Creator legal signed", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_segment_assigned", label: "Creator segment assigned", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_approved", label: "Creator approved", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_rejected", label: "Creator rejected", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_needs_changes", label: "Creator needs changes", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_role_activated", label: "Creator role activated", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_role_activation_blocked", label: "Creator role activation blocked", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "owner_override_applied", label: "Owner override applied", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "owner_override_cleared", label: "Owner override cleared", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "privacy_page_viewed", label: "Privacy page viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "terms_page_viewed", label: "Terms page viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "drops_page_viewed", label: "Drops page viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "content"] },
  { eventName: "faq_page_viewed", label: "FAQ page viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "faq_search_used", label: "FAQ search used", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "faq_category_selected", label: "FAQ category selected", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "faq_question_toggled", label: "FAQ question toggled", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "dashboard_viewed", label: "Dashboard viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "library_viewed", label: "Library viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "content"] },
  { eventName: "profile_settings_viewed", label: "Profile settings viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "experience_hub_viewed", label: "Experiences viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "tasks"] },
  { eventName: "daily_check_in_claim", label: "Daily check-in claimed", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks"] },
  { eventName: "wallet_opened", label: "Wallet opened", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce"] },
  { eventName: "purchase_package_selected", label: "Wallet package selected", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce"] },
  { eventName: "begin_checkout", label: "Checkout started", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce"] },
  { eventName: "purchase", label: "Purchase completed (GA)", category: "commerce", sources: DEFAULT_GA_ONLY_SOURCES, modules: ["commerce"] },
  { eventName: "spend_virtual_currency", label: "Virtual currency spent (GA)", category: "commerce", sources: DEFAULT_GA_ONLY_SOURCES, modules: ["commerce", "content"] },
  { eventName: "gumdrops_purchase_completed", label: "Gum Drops purchase completed", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce", "tasks"] },
  { eventName: "gumdrops_purchase_failed", label: "Gum Drops purchase failed", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce"] },
  { eventName: "purchase_verified", label: "Purchase verified", category: "commerce", sources: DEFAULT_SERVER_SOURCES, modules: ["commerce"] },
  { eventName: "drop_card_impression", label: "Drop card impression", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content"] },
  { eventName: "view_drop_details", label: "Drop details viewed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content"] },
  { eventName: "drop_clicked", label: "Drop clicked", category: "content", sources: DEFAULT_SERVER_SOURCES, modules: ["content"] },
  { eventName: "drop_preview_opened", label: "Drop preview opened", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content"] },
  { eventName: "drop_unlock_attempted", label: "Drop unlock attempted", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content"] },
  { eventName: "unlock_drop_success", label: "Drop unwrapped", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "tasks"] },
  { eventName: "drop_share_copied", label: "Drop share copied", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content"] },
  { eventName: "viewer_opened", label: "Viewer opened", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer", "content"] },
  { eventName: "viewer_session_started", label: "Viewer session started", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "viewer_session_completed", label: "Viewer session completed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "viewer_asset_started", label: "Viewer asset started", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "viewer_asset_changed", label: "Viewer asset changed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "viewer_asset_completed", label: "Viewer asset completed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "viewer_asset_consumed", label: "Viewer asset consumed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "video_played", label: "Video played (GA)", category: "content", sources: DEFAULT_GA_ONLY_SOURCES, modules: ["viewer", "content"] },
  { eventName: "viewer_watch_checkpoint", label: "Viewer watch checkpoint", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "viewer_content_loaded", label: "Viewer content loaded", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "viewer_source_downloaded", label: "Viewer source downloaded", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "viewer_related_drop_clicked", label: "Viewer related drop clicked", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer", "content"] },
  { eventName: "viewer_backgrounded", label: "Viewer moved to background", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "creator_followed", label: "Creator followed", category: "engagement", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "engagement"] },
  { eventName: "creator_unfollowed", label: "Creator unfollowed", category: "engagement", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "engagement"] },
  { eventName: "creator_notifications_enabled", label: "Creator notifications enabled", category: "notifications", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "notifications"] },
  { eventName: "creator_notifications_disabled", label: "Creator notifications disabled", category: "notifications", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "notifications"] },
  { eventName: "creator_profile_viewed", label: "Creator profile viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "engagement"] },
  { eventName: "creator_broadcast_opened", label: "Creator broadcast opened", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "notifications"] },
  { eventName: "creator_message_sent", label: "Creator message sent", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_media_sent", label: "Creator media sent", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_custom_request_created", label: "Creator custom request created", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_custom_request_accepted", label: "Creator custom request accepted", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_custom_request_declined", label: "Creator custom request declined", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_call_booking_created", label: "Creator call booking created", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_call_booking_completed", label: "Creator call booking completed", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_subscription_started", label: "Creator subscription started", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_subscription_renewed", label: "Creator subscription renewed", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_subscription_failed", label: "Creator subscription failed", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_subscription_canceled", label: "Creator subscription canceled", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_drop_unwrapped", label: "Creator drop unwrapped", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "content"] },
  { eventName: "creator_ledger_accrual_created", label: "Creator ledger accrual created", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_cashout_requested", label: "Creator cashout requested", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_cashout_honored", label: "Creator cashout honored", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "notifications_dropdown_opened", label: "Notifications opened", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"] },
  { eventName: "notification_opened", label: "Notification opened", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"] },
  { eventName: "notification_marked_read", label: "Notification marked read", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"] },
  { eventName: "notification_mark_all_read", label: "Notifications marked read", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"] },
  { eventName: "task_notifications_enabled", label: "Notifications enabled", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications", "tasks"] },
  { eventName: "notification_prompt_banner_viewed", label: "Notification prompt viewed", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"] },
  { eventName: "notification_prompt_banner_dismissed", label: "Notification prompt dismissed", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"] },
  { eventName: "notification_prompt_install_help_opened", label: "Notification install help opened", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"] },
  { eventName: "daily_deadline_in_app_reminder_shown", label: "In-app deadline reminder shown", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications", "tasks"] },
  { eventName: "daily_deadline_in_app_reminder_opened", label: "In-app deadline reminder opened", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications", "tasks"] },
  { eventName: "daily_deadline_in_app_reminder_dismissed", label: "In-app deadline reminder dismissed", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications", "tasks"] },
  { eventName: "feedback_modal_opened", label: "Feedback modal opened", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks"] },
  { eventName: "feedback_submitted", label: "Feedback submitted", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks"] },
  { eventName: "feature_flag_exposed", label: "Feature flag exposed", category: "system", sources: DEFAULT_CLIENT_SOURCES, modules: ["runtime"] },
  { eventName: "experiment_variant_exposed", label: "Experiment variant exposed", category: "system", sources: DEFAULT_CLIENT_SOURCES, modules: ["runtime"] },
  { eventName: "navigation_click", label: "Navigation click", category: "navigation", sources: DEFAULT_CLIENT_SOURCES, modules: ["navigation"] },
  { eventName: "semantic_page_viewed", label: "Semantic page viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "semantic_page_engaged", label: "Semantic page engaged", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "semantic_page_passive", label: "Semantic passive page view", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "semantic_page_exited", label: "Semantic page exited", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "semantic_page_bounced", label: "Semantic page bounced", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "semantic_target_clicked", label: "Semantic target clicked", category: "navigation", sources: DEFAULT_CLIENT_SOURCES, modules: ["navigation", "engagement"] },
  { eventName: "recent_activity_viewed", label: "Recent activity viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "recent_activity_toggled", label: "Recent activity toggled", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "daily_tasks_viewed", label: "Daily tasks viewed", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks"] },
  { eventName: "daily_task_action_clicked", label: "Daily task action clicked", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks"] },
  { eventName: "task_guidance_banner_viewed", label: "Task guidance banner viewed", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks", "task_guidance"] },
  { eventName: "task_guidance_banner_dismissed", label: "Task guidance banner dismissed", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks", "task_guidance"] },
  { eventName: "task_guidance_cta_clicked", label: "Task guidance CTA clicked", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks", "task_guidance"] },
  { eventName: "task_guidance_completed", label: "Task guidance completed", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks", "task_guidance"] },
  { eventName: "daily_task_assigned", label: "Daily task assigned", category: "tasks", sources: ["backend", "canonical"], modules: ["tasks"] },
  { eventName: "daily_task_started", label: "Daily task started", category: "tasks", sources: ["backend", "canonical"], modules: ["tasks"] },
  { eventName: "daily_task_completed", label: "Daily task completed", category: "tasks", sources: ["backend", "canonical"], modules: ["tasks"] },
  { eventName: "daily_task_failed", label: "Daily task failed", category: "tasks", sources: ["backend", "canonical"], modules: ["tasks"] },
  { eventName: "daily_task_deadline_reminder_sent", label: "Daily task reminder sent", category: "tasks", sources: ["backend", "canonical"], modules: ["tasks", "notifications"] },
  { eventName: "daily_deadline_browser_notification_shown", label: "Browser deadline notification shown", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications", "tasks"] },
  { eventName: "promo_card_clicked", label: "Promo card clicked", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "collection_filter_changed", label: "Collection filter changed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "owned_drop_clicked", label: "Owned drop clicked", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "content"] },
  { eventName: "cookie_consent_updated", label: "Cookie consent updated", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "insufficient_balance_modal_closed", label: "Insufficient balance modal closed", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce"] },
  { eventName: "insufficient_balance_get_more_clicked", label: "Insufficient balance get more clicked", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce"] },
  { eventName: "hero_cta_clicked", label: "Hero CTA clicked", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "featured_drop_clicked", label: "Featured drop clicked", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "content"] },
  { eventName: "admin_chart_view_changed", label: "Admin chart view changed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin"] },
  { eventName: "asset_upload_started", label: "Asset upload started", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin"] },
  { eventName: "asset_upload_success", label: "Asset upload success", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin"] },
  { eventName: "asset_upload_failed", label: "Asset upload failed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin"] },
  { eventName: "admin_dashboard_viewed", label: "Admin dashboard viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_analytics_viewed", label: "Admin analytics viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_debug_viewed", label: "Admin debug viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_users_viewed", label: "Admin users viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_content_viewed", label: "Admin content viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_drops_viewed", label: "Admin drops viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_queue_viewed", label: "Admin queue viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_roster_viewed", label: "Admin roster viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_user_detail_viewed", label: "Admin user detail viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_creator_created_directly", label: "Creator created directly from roster", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "onboarding"] },
  { eventName: "creator_application_review_saved", label: "Creator application review saved", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "creator"] },
  {
    eventName: "security_screenshot_attempted",
    label: "Screenshot attempt detected",
    category: "security",
    sources: DEFAULT_SERVER_SOURCES,
    modules: ["security", "viewer"],
    auditCoveredBy: ["security_screenshot_mac_attempted", "security_screenshot_windows_attempted"],
  },
  { eventName: "security_screenshot_mac_attempted", label: "macOS screenshot attempt detected", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
  { eventName: "security_screenshot_windows_attempted", label: "Windows screenshot attempt detected", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
  { eventName: "security_screen_record_attempted", label: "Screen recording attempt detected", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
  { eventName: "security_print_attempted", label: "Print attempt detected", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
  { eventName: "security_save_attempted", label: "Save shortcut attempt detected", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
  { eventName: "security_copy_attempted", label: "Copy attempt detected", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
  { eventName: "security_selection_attempted", label: "Selection attempt detected", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
  { eventName: "security_drag_export_attempted", label: "Drag export attempt detected", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
  { eventName: "security_context_menu_attempted", label: "Context menu attempt detected", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
  { eventName: "security_devtools_attempted", label: "Developer tools attempt detected", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
  { eventName: "security_source_view_attempted", label: "View source attempt detected", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
  { eventName: "security_capture_pattern_detected", label: "Capture pattern detected", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
];

export const TELEMETRY_MODULE_INDEXES: TelemetryModuleIndex[] = [
  {
    key: "auth",
    label: "Auth",
    eventNames: [
      "auth_modal_opened",
      "auth_google_sign_in_attempted",
      "auth_google_sign_in_success",
      "auth_sign_in_attempted",
      "auth_sign_in_success",
      "auth_sign_up_attempted",
      "auth_sign_up_success",
      "user_registered",
      "auth_session_restored",
      "auth_logout",
      "password_reset_requested",
    ],
    fallbackSources: ["analytics_event_facts", "ga4", "telemetry_logs"],
  },
  {
    key: "onboarding",
    label: "Onboarding",
    eventNames: [
      "guided_onboarding_started",
      "guided_onboarding_completed",
      "guided_onboarding_step_started",
      "guided_onboarding_step_completed",
      "onboarding_step_viewed",
      "avatar_uploaded",
      "user_registered",
      "creator_intro_acknowledged",
      "creator_contract_signed",
    ],
    fallbackSources: ["analytics_event_facts", "ga4", "telemetry_logs"],
  },
  {
    key: "navigation",
    label: "Navigation",
    eventNames: [
      "navigation_click",
      "semantic_page_viewed",
      "semantic_page_engaged",
      "semantic_page_passive",
      "semantic_page_exited",
      "semantic_page_bounced",
      "semantic_target_clicked",
      "dashboard_viewed",
      "library_viewed",
      "profile_settings_viewed",
      "experience_hub_viewed",
      "creator_apply_viewed",
      "creator_waitlist_viewed",
      "privacy_page_viewed",
      "terms_page_viewed",
      "drops_page_viewed",
      "faq_page_viewed",
      "faq_category_selected",
      "home_page_viewed",
      "recent_activity_toggled",
    ],
    fallbackSources: ["analytics_page_daily", "ga4", "analytics_event_facts"],
  },
  {
    key: "notifications",
    label: "Notifications",
    eventNames: [
      "notifications_dropdown_opened",
      "notification_opened",
      "notification_marked_read",
      "notification_mark_all_read",
      "task_notifications_enabled",
      "notification_prompt_banner_viewed",
      "notification_prompt_banner_dismissed",
      "notification_prompt_install_help_opened",
      "daily_deadline_in_app_reminder_shown",
      "daily_deadline_in_app_reminder_opened",
      "daily_deadline_in_app_reminder_dismissed",
      "daily_deadline_browser_notification_shown",
    ],
    fallbackSources: ["analytics_event_facts", "ga4", "telemetry_logs"],
  },
  {
    key: "tasks",
    label: "Daily Tasks",
    eventNames: [
      "daily_check_in_claim",
      "daily_tasks_viewed",
      "daily_task_action_clicked",
      "daily_task_assigned",
      "daily_task_started",
      "daily_task_completed",
      "daily_task_failed",
      "daily_task_deadline_reminder_sent",
      "feedback_modal_opened",
      "feedback_submitted",
    ],
    fallbackSources: ["daily_task_events", "analytics_task_daily", "analytics_event_facts"],
  },
  {
    key: "task_guidance",
    label: "Task Guidance",
    eventNames: [
      "task_guidance_banner_viewed",
      "task_guidance_banner_dismissed",
      "task_guidance_cta_clicked",
      "task_guidance_completed",
    ],
    fallbackSources: ["analytics_event_facts", "ga4", "telemetry_logs"],
  },
  {
    key: "commerce",
    label: "Commerce",
    eventNames: [
      "wallet_opened",
      "purchase_package_selected",
      "insufficient_balance_modal_closed",
      "insufficient_balance_get_more_clicked",
      "begin_checkout",
      "purchase",
      "spend_virtual_currency",
      "gumdrops_purchase_completed",
      "gumdrops_purchase_failed",
      "purchase_verified",
    ],
    fallbackSources: ["transactions", "analytics_commerce_daily", "analytics_event_facts", "ga4"],
  },
  {
    key: "content",
    label: "Content",
    eventNames: [
      "drop_card_impression",
      "view_drop_details",
      "featured_drop_clicked",
      "owned_drop_clicked",
      "drop_clicked",
      "drop_preview_opened",
      "drop_unlock_attempted",
      "unlock_drop_success",
      "drop_share_copied",
    ],
    fallbackSources: ["analytics_drop_daily", "analytics_event_facts", "transactions", "ga4"],
  },
  {
    key: "viewer",
    label: "Viewer",
    eventNames: [
      "viewer_opened",
      "viewer_session_started",
      "viewer_session_completed",
      "viewer_asset_started",
      "viewer_asset_changed",
      "viewer_asset_completed",
      "viewer_asset_consumed",
      "video_played",
      "viewer_watch_checkpoint",
      "viewer_content_loaded",
      "viewer_source_downloaded",
      "viewer_related_drop_clicked",
      "viewer_backgrounded",
    ],
    fallbackSources: ["analytics_watch_sessions", "analytics_watch_assets", "analytics_session_facts", "analytics_event_facts", "ga4", "telemetry_logs"],
  },
  {
    key: "creator",
    label: "Creator Experiences",
    eventNames: [
      "creator_followed",
      "creator_unfollowed",
      "creator_notifications_enabled",
      "creator_notifications_disabled",
      "creator_apply_viewed",
      "creator_waitlist_viewed",
      "creator_intro_acknowledged",
      "creator_contract_signed",
      "creator_profile_viewed",
      "creator_broadcast_opened",
      "creator_message_sent",
      "creator_media_sent",
      "creator_custom_request_created",
      "creator_custom_request_accepted",
      "creator_custom_request_declined",
      "creator_call_booking_created",
      "creator_call_booking_completed",
      "creator_subscription_started",
      "creator_subscription_renewed",
      "creator_subscription_failed",
      "creator_subscription_canceled",
      "creator_drop_unwrapped",
      "creator_ledger_accrual_created",
      "creator_cashout_requested",
      "creator_cashout_honored",
    ],
    fallbackSources: ["analytics_event_facts", "creator_relationships", "creator_subscriptions", "creator_message_threads", "creator_custom_requests", "creator_call_bookings", "creator_ledger_accruals"],
  },
  {
    key: "engagement",
    label: "Engagement",
    eventNames: [
      "home_page_viewed",
      "privacy_page_viewed",
      "hero_cta_clicked",
      "promo_card_clicked",
      "collection_filter_changed",
      "cookie_consent_updated",
      "terms_page_viewed",
      "semantic_page_viewed",
      "semantic_page_engaged",
      "semantic_page_passive",
      "semantic_page_exited",
      "semantic_page_bounced",
      "dashboard_viewed",
      "library_viewed",
      "profile_settings_viewed",
      "experience_hub_viewed",
      "recent_activity_viewed",
      "recent_activity_toggled",
      "drops_page_viewed",
      "faq_page_viewed",
      "faq_search_used",
      "faq_category_selected",
      "faq_question_toggled",
    ],
    fallbackSources: ["analytics_page_daily", "analytics_guest_batches", "ga4"],
  },
  {
    key: "admin",
    label: "Admin",
    eventNames: [
      "asset_upload_started",
      "asset_upload_success",
      "admin_chart_view_changed",
      "asset_upload_failed",
      "admin_dashboard_viewed",
      "admin_analytics_viewed",
      "admin_debug_viewed",
      "admin_users_viewed",
      "admin_content_viewed",
      "admin_drops_viewed",
      "admin_queue_viewed",
      "admin_roster_viewed",
      "admin_user_detail_viewed",
      "admin_creator_created_directly",
      "creator_application_review_saved",
    ],
    fallbackSources: ["analytics_event_facts", "ga4"],
  },
  {
    key: "runtime",
    label: "Runtime",
    eventNames: [
      "feature_flag_exposed",
      "experiment_variant_exposed",
    ],
    fallbackSources: ["analytics_event_facts", "telemetry_logs"],
  },
  {
    key: "security",
    label: "Security",
    eventNames: [
      "security_screenshot_attempted",
      "security_screenshot_mac_attempted",
      "security_screenshot_windows_attempted",
      "security_screen_record_attempted",
      "security_print_attempted",
      "security_save_attempted",
      "security_copy_attempted",
      "security_selection_attempted",
      "security_drag_export_attempted",
      "security_context_menu_attempted",
      "security_devtools_attempted",
      "security_source_view_attempted",
      "security_capture_pattern_detected",
    ],
    fallbackSources: ["security_events", "analytics_event_facts", "telemetry_logs"],
  },
];

export const TELEMETRY_EVENT_NAMES = TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName);
export const TELEMETRY_EVENT_NAME_SET = new Set(TELEMETRY_EVENT_NAMES);

export const TELEMETRY_EVENT_OPTIONS_BY_NAME = Object.fromEntries(
  TELEMETRY_EVENT_OPTIONS.map((event) => [event.eventName, event]),
) as Record<string, TelemetryEventOption>;

export const TELEMETRY_EVENT_ALIAS_MAP = Object.fromEntries(
  TELEMETRY_EVENT_OPTIONS.flatMap((event) => (event.aliases ?? []).map((alias) => [alias, event.eventName] as const)),
) as Record<string, string>;

export const TELEMETRY_EVENT_LABELS = Object.fromEntries(
  TELEMETRY_EVENT_OPTIONS.flatMap((event) => [
    [event.eventName, event.label] as const,
    ...(event.aliases ?? []).map((alias) => [alias, event.label] as const),
  ]),
) as Record<string, string>;

export const TELEMETRY_EVENT_QUERY_NAMES = Array.from(
  new Set([...TELEMETRY_EVENT_NAMES, ...Object.keys(TELEMETRY_EVENT_ALIAS_MAP)]),
);

export const ADMIN_TELEMETRY_LOG_EVENT_NAMES = [
  "auth_sign_in_attempted",
  "auth_sign_in_success",
  "auth_sign_in_failed",
  "auth_sign_up_attempted",
  "auth_sign_up_success",
  "auth_sign_up_failed",
  "auth_google_sign_in_attempted",
  "auth_google_sign_in_success",
  "auth_google_sign_in_failed",
  "guided_onboarding_completed",
  "admin_dashboard_viewed",
  "admin_analytics_viewed",
  "admin_debug_viewed",
  "admin_users_viewed",
  "admin_content_viewed",
  "admin_drops_viewed",
  "admin_queue_viewed",
  "admin_roster_viewed",
  "admin_user_detail_viewed",
  "admin_creator_created_directly",
  "creator_application_review_saved",
  "creator_intro_acknowledged",
  "creator_legally_cleared_override",
  "creator_contract_signed",
  "navigation_click",
  "viewer_opened",
  "viewer_content_loaded",
  "viewer_session_started",
  "viewer_session_completed",
  "viewer_asset_started",
  "viewer_asset_completed",
  "viewer_asset_changed",
  "viewer_source_downloaded",
  "viewer_related_drop_clicked",
] as const;

export function normalizeTelemetryEventName(eventName: string) {
  return TELEMETRY_EVENT_ALIAS_MAP[eventName] || eventName;
}

export function getTelemetryEventOption(eventName: string) {
  const canonicalEventName = normalizeTelemetryEventName(eventName);
  return {
    canonicalEventName,
    option: TELEMETRY_EVENT_OPTIONS_BY_NAME[canonicalEventName],
  };
}

export function buildTelemetryEventMetadata(eventName: string): TelemetryResolvedEventMetadata {
  const { canonicalEventName, option } = getTelemetryEventOption(eventName);

  return {
    canonicalEventName,
    option,
    metadataParams: {
      event_index_version: TELEMETRY_EVENT_INDEX_VERSION,
      event_category: option?.category || "system",
      ...(option?.modules?.length ? { event_modules: option.modules.join("|") } : {}),
      ...(option?.sources?.length ? { tracking_sources: option.sources.join("|") } : {}),
      ...(eventName !== canonicalEventName ? { legacy_event_name: eventName } : {}),
    },
  };
}
