import { BEHAVIORAL_NORMALIZED_ACTIONS } from "@/lib/behavioral/event-fact-contract";

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

export type TelemetryEventFamily =
  | "page_view"
  | "drop"
  | "unlock"
  | "purchase"
  | "auth"
  | "onboarding"
  | "task"
  | "notification"
  | "chat_message"
  | "creator"
  | "admin"
  | "system"
  | "security"
  | "diagnostic"
  | "engagement";

export interface TelemetryEventPayloadContract {
  eventName: string;
  aliases: string[];
  version: number;
  family: TelemetryEventFamily;
  requiredActorFields: string[];
  requiredObjectFields: string[];
  requiredSurfaceFields: string[];
  dedupeKeyRequired: boolean;
  guestAllowed: boolean;
  adminExcludedFromUserAnalytics: boolean;
  legacyDeprecated: boolean;
  missingFieldsRisk: "low" | "medium" | "high";
}

const DEFAULT_CLIENT_SOURCES: TelemetryEventSource[] = ["ga4", "client", "backend"];
const DEFAULT_SERVER_SOURCES: TelemetryEventSource[] = ["ga4", "backend"];
const DEFAULT_CANONICAL_SERVER_SOURCES: TelemetryEventSource[] = ["ga4", "backend", "canonical"];
const DEFAULT_GA_ONLY_SOURCES: TelemetryEventSource[] = ["ga4"];

export const TELEMETRY_EVENT_INDEX_VERSION = "2026.05.05.1";
export const TELEMETRY_USER_ACTION_TAXONOMY_VERSION = "2026.05.event-facts.5";
export const TELEMETRY_USER_ACTION_TAXONOMY_NAMES = BEHAVIORAL_NORMALIZED_ACTIONS;

export const TELEMETRY_EVENT_OPTIONS: TelemetryEventOption[] = [
  { eventName: "auth_modal_opened", label: "Auth modal opened", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
  { eventName: "auth_modal_closed_incomplete", label: "Auth modal closed without complete", category: "auth", sources: DEFAULT_CLIENT_SOURCES, modules: ["auth"] },
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
    aliases: ["onboarding_complete", "onboarding_completed"],
  },
  {
    eventName: "guided_onboarding_step_started",
    label: "Guided onboarding step started",
    category: "engagement",
    sources: DEFAULT_CANONICAL_SERVER_SOURCES,
    modules: ["onboarding", "engagement"],
    aliases: ["onboarding_step_started"],
  },
  {
    eventName: "guided_onboarding_step_completed",
    label: "Guided onboarding step completed",
    category: "engagement",
    sources: DEFAULT_CANONICAL_SERVER_SOURCES,
    modules: ["onboarding", "engagement"],
    aliases: ["onboarding_step_completed"],
  },
  { eventName: "onboarding_step_viewed", label: "Onboarding step viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["onboarding"] },
  { eventName: "avatar_uploaded", label: "Avatar uploaded", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["onboarding"] },
  { eventName: "page_viewed", label: "Page viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"], auditCoveredBy: ["semantic_page_viewed"] },
  { eventName: "home_page_viewed", label: "Home page viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "hero_cta_clicked", label: "Hero CTA clicked", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "creator_apply_viewed", label: "Creator apply page viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "engagement", "navigation"] },
  { eventName: "creator_waitlist_viewed", label: "Creator waitlist page viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "engagement", "navigation"] },
  { eventName: "creator_agreement_viewed", label: "Creator agreement viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "onboarding"] },
  { eventName: "creator_agreement_section_opened", label: "Creator agreement section opened", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "onboarding"] },
  { eventName: "creator_agreement_acknowledgement_checked", label: "Creator agreement acknowledgement checked", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "onboarding"] },
  { eventName: "creator_agreement_signed", label: "Creator agreement signed", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_intake_started", label: "Creator intake started", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "onboarding"] },
  { eventName: "creator_intake_step_completed", label: "Creator intake step completed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "onboarding"] },
  { eventName: "creator_intake_goal_selected", label: "Creator intake goal selected", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "onboarding"] },
  { eventName: "creator_intake_recommended_setup_shown", label: "Creator intake recommended setup shown", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "onboarding"] },
  { eventName: "creator_intake_submitted", label: "Creator intake submitted", category: "engagement", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "onboarding"] },
  { eventName: "creator_onboarding_submitted", label: "Creator onboarding submitted", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "admin", "onboarding"] },
  { eventName: "creator_application_updated", label: "Creator application updated", category: "engagement", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "onboarding"] },
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
  { eventName: "drops_page_viewed", label: "Drops page viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "content", "navigation"] },
  { eventName: "faq_page_viewed", label: "FAQ page viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "faq_search_used", label: "FAQ search used", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "faq_category_selected", label: "FAQ category selected", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "faq_question_toggled", label: "FAQ question toggled", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
    { eventName: "dashboard_viewed", label: "Dashboard viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
    { eventName: "library_viewed", label: "Library viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "content", "navigation"] },
    { eventName: "profile_settings_viewed", label: "Profile settings viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "support_inbox_viewed", label: "Support inbox viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "support_ticket_created", label: "Support ticket created", category: "engagement", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["engagement"], aliases: ["support_ticket_submitted"] },
  { eventName: "support_thread_opened", label: "Support thread opened", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"], auditCoveredBy: ["support_reply_viewed"] },
  { eventName: "support_reply_viewed", label: "Support reply viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "support_reply_sent", label: "Support reply sent", category: "engagement", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["engagement"], aliases: ["support_thread_replied"] },
  { eventName: "support_thread_reply_failed", label: "Support thread reply failed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "bug_report_submitted", label: "Bug report submitted", category: "engagement", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["engagement"], aliases: ["feedback_submitted"] },
  { eventName: "experience_hub_viewed", label: "Experiences viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "tasks", "navigation"] },
  { eventName: "daily_checkin_claimed", label: "Daily check-in claimed", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks"], aliases: ["daily_check_in_claim", "daily_reward_claimed"] },
  { eventName: "wallet_opened", label: "Wallet opened", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce"] },
  { eventName: "wallet_closed_incomplete", label: "Wallet closed without completion", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce"], auditCoveredBy: ["wallet_opened"] },
  { eventName: "purchase_package_selected", label: "Wallet package selected", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce"] },
  { eventName: "begin_checkout", label: "Checkout started", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce"] },
  { eventName: "purchase", label: "Purchase completed (GA)", category: "commerce", sources: DEFAULT_GA_ONLY_SOURCES, modules: ["commerce"] },
  { eventName: "spend_virtual_currency", label: "Virtual currency spent (GA)", category: "commerce", sources: DEFAULT_GA_ONLY_SOURCES, modules: ["commerce", "content"] },
  { eventName: "gumdrops_purchase_completed", label: "Gum Drops purchase completed", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce", "tasks"] },
  { eventName: "gumdrops_purchase_failed", label: "Gum Drops purchase failed", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce"] },
  { eventName: "purchase_verified", label: "Purchase verified", category: "commerce", sources: DEFAULT_SERVER_SOURCES, modules: ["commerce"] },
  { eventName: "drop_card_impression", label: "Drop card impression", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content"] },
  { eventName: "search_query_submitted", label: "Search query submitted", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "navigation"] },
  { eventName: "filter_selected", label: "Filter selected", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "navigation"] },
  { eventName: "sort_changed", label: "Sort changed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "navigation"] },
  { eventName: "category_clicked", label: "Category clicked", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "navigation"] },
  { eventName: "creator_search_selected", label: "Creator search selected", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "content", "navigation"] },
  { eventName: "view_drop_details", label: "Drop details viewed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content"] },
  { eventName: "drop_clicked", label: "Drop clicked", category: "content", sources: DEFAULT_SERVER_SOURCES, modules: ["content"] },
  { eventName: "drop_preview_opened", label: "Drop preview opened", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content"] },
  { eventName: "drop_preview_page_viewed", label: "Drop preview page viewed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "navigation"] },
  { eventName: "drop_preview_creator_cover_viewed", label: "Drop preview creator cover viewed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "creator"] },
  { eventName: "drop_preview_creator_share_clicked", label: "Drop preview creator share clicked", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "creator"] },
  { eventName: "drop_preview_guest_signup_cta_viewed", label: "Drop preview guest signup CTA viewed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "auth"] },
  { eventName: "drop_preview_guest_signup_cta_clicked", label: "Drop preview guest signup CTA clicked", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "auth"] },
  { eventName: "drop_preview_topup_cta_viewed", label: "Drop preview refill CTA viewed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "commerce"] },
  { eventName: "drop_preview_topup_cta_clicked", label: "Drop preview refill CTA clicked", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "commerce"] },
  { eventName: "drop_preview_unwrap_cta_viewed", label: "Drop preview unwrap CTA viewed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "commerce"] },
  { eventName: "drop_preview_unwrap_cta_clicked", label: "Drop preview unwrap CTA clicked", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "commerce"] },
  { eventName: "drop_preview_owned_view_clicked", label: "Drop preview owned view clicked", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "navigation"] },
  { eventName: "drop_preview_cta_viewed", label: "Drop preview CTA viewed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "commerce"] },
  { eventName: "drop_preview_cta_clicked", label: "Drop preview CTA clicked", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "commerce"] },
  { eventName: "drop_preview_feedback_reacted", label: "Drop preview feedback reacted", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "content"] },
  { eventName: "drop_preview_idle_reached", label: "Drop preview idle reached", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "content"] },
  { eventName: "drop_preview_closed_incomplete", label: "Drop preview closed without unwrap", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content"] },
  { eventName: "drop_preview_unlock_success_state_viewed", label: "Drop preview unlock success state viewed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "commerce"] },
  { eventName: "drop_preview_open_library_clicked", label: "Drop preview open library clicked", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "navigation"] },
  { eventName: "drop_preview_keep_unwrapping_clicked", label: "Drop preview keep unwrapping clicked", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "navigation"] },
  { eventName: "content_satisfaction_positive", label: "Content satisfaction positive", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "engagement", "viewer"] },
  { eventName: "content_satisfaction_negative", label: "Content satisfaction negative", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "engagement", "viewer"] },
  { eventName: "content_satisfaction_skipped", label: "Content satisfaction skipped", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "engagement", "viewer"] },
  { eventName: "recommendation_reason_helpful", label: "Recommendation reason helpful", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "engagement"] },
  { eventName: "recommendation_reason_not_helpful", label: "Recommendation reason not helpful", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "engagement"] },
  { eventName: "drop_not_interested", label: "Drop not interested", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "engagement"] },
  { eventName: "category_not_interested", label: "Category not interested", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "engagement"] },
  { eventName: "recommendation_dismissed", label: "Recommendation dismissed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content", "engagement"] },
  { eventName: "drop_unwrap_intent_blocked_by_funds", label: "Unwrap intent blocked by funds", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content"] },
  { eventName: "drop_unlock_attempted", label: "Drop unlock attempted", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content"] },
  { eventName: "drop_unwrapped", label: "Drop unwrapped", category: "content", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["content", "commerce"], aliases: ["drop_unlocked"] },
  { eventName: "unlock_drop_success", label: "Drop unwrapped (legacy compatibility)", category: "content", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["content", "commerce"], auditCoveredBy: ["drop_unwrapped"] },
  { eventName: "entitlement_granted", label: "Entitlement granted", category: "content", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["content", "commerce", "admin"] },
  { eventName: "drop_share_copied", label: "Drop share copied", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["content"] },
  { eventName: "viewer_opened", label: "Viewer opened", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer", "content"] },
  { eventName: "viewer_session_started", label: "Viewer session started", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "viewer_session_completed", label: "Viewer session completed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "watch_session_started", label: "Watch session started", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer", "content"] },
  { eventName: "watch_session_visible_tick", label: "Watch session visible tick", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"], aliases: ["watch_session_tick"] },
  { eventName: "watch_session_progress", label: "Watch session progress", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "watch_session_paused", label: "Watch session paused", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "watch_session_resumed", label: "Watch session resumed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "watch_session_hidden", label: "Watch session hidden", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer"] },
  { eventName: "watch_session_ended", label: "Watch session ended", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer", "content"], aliases: ["watch_session_completed"] },
  { eventName: "watch_score_computed", label: "Watch score computed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer", "content"] },
  { eventName: "file_viewed", label: "File viewed", category: "content", sources: DEFAULT_CLIENT_SOURCES, modules: ["viewer", "content"], aliases: ["viewer_asset_started", "viewer_asset_changed"] },
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
  { eventName: "creator_not_interested", label: "Creator not interested", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "engagement"] },
  { eventName: "creator_muted", label: "Creator muted", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "engagement"] },
  { eventName: "creator_notifications_enabled", label: "Creator notifications enabled", category: "notifications", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "notifications"] },
  { eventName: "creator_notifications_disabled", label: "Creator notifications disabled", category: "notifications", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "notifications"] },
  { eventName: "creator_profile_viewed", label: "Creator profile viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "engagement"] },
  { eventName: "creator_profile_link_clicked", label: "Creator profile link clicked", category: "navigation", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "navigation"] },
  { eventName: "creator_profile_link_missing", label: "Creator profile link missing", category: "navigation", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "navigation", "runtime"] },
  { eventName: "creator_rail_impression", label: "Creator rail impression", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "engagement", "navigation"], aliases: ["creator_spotlight_viewed"] },
  { eventName: "creator_settings_updated", label: "Creator settings updated", category: "engagement", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator"] },
  { eventName: "creator_broadcast_opened", label: "Creator broadcast opened", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "notifications"] },
  { eventName: "creator_experience_lane_opened", label: "Creator experience lane opened", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "engagement"] },
  { eventName: "creator_experience_lane_closed", label: "Creator experience lane closed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "engagement"] },
  { eventName: "creator_experience_cta_clicked", label: "Creator experience CTA clicked", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "engagement", "commerce"] },
  { eventName: "creator_experience_insufficient_balance", label: "Creator experience blocked by balance", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_experience_request_category_selected", label: "Creator request category selected", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "engagement"] },
  { eventName: "creator_experience_booking_type_selected", label: "Creator booking type selected", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["creator", "engagement"] },
  { eventName: "chat_thread_opened", label: "Chat thread opened", category: "navigation", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "chat_compose_sheet_opened", label: "Chat compose sheet opened", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "chat_list_search_focused", label: "Chat list search focused", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "chat_message_send_attempted", label: "Chat message send attempted", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "chat_message_send_failed", label: "Chat message send failed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "chat_message_sent", label: "Chat message sent", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "creator_message_sent", label: "Creator message sent", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_media_sent", label: "Creator media sent", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_private_chat_opened", label: "Creator private chat opened", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_custom_request_created", label: "Creator custom request created", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_custom_request_accepted", label: "Creator custom request accepted", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_custom_request_declined", label: "Creator custom request declined", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_call_booking_created", label: "Creator call booking created", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_live_time_booked", label: "Creator live time booked", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_call_booking_completed", label: "Creator call booking completed", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_fan_pass_started", label: "Creator Fan Pass started", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_subscription_started", label: "Creator subscription started", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_subscription_renewed", label: "Creator subscription renewed", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_subscription_failed", label: "Creator subscription failed", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_subscription_canceled", label: "Creator subscription canceled", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_drop_unwrapped", label: "Creator drop unwrapped", category: "content", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "content"] },
  { eventName: "creator_ledger_accrual_created", label: "Creator ledger accrual created", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_cashout_requested", label: "Creator cashout requested", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "creator_cashout_honored", label: "Creator cashout honored", category: "commerce", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["creator", "commerce"] },
  { eventName: "notifications_dropdown_opened", label: "Notifications opened", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"] },
  { eventName: "notification_opened", label: "Notification opened", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"] },
  { eventName: "notification_read", label: "Notification read", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"], aliases: ["notification_marked_read"] },
  { eventName: "notification_action_clicked", label: "Notification action clicked", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications", "navigation"] },
  { eventName: "notification_mark_all_read", label: "Notifications marked read", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"] },
  { eventName: "notification_cleared", label: "Notification cleared", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"], auditCoveredBy: ["notification_mark_all_read"] },
  { eventName: "task_notifications_enabled", label: "Notifications enabled", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications", "tasks"], aliases: ["notification_enabled"] },
  { eventName: "notification_prompt_banner_viewed", label: "Notification prompt viewed", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"], aliases: ["notification_prompted"] },
  { eventName: "notification_prompt_banner_dismissed", label: "Notification prompt dismissed", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"] },
  { eventName: "notification_prompt_install_help_opened", label: "Notification install help opened", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications"] },
  { eventName: "notification_sent", label: "Notification sent", category: "notifications", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["notifications"], auditCoveredBy: ["daily_task_deadline_reminder_sent"] },
  { eventName: "notification_duplicate_prevented", label: "Duplicate notification prevented", category: "notifications", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["notifications"], auditCoveredBy: ["daily_deadline_browser_notification_shown"] },
  { eventName: "queued_drop_returned_live", label: "Queued drop returned live", category: "notifications", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["notifications", "content"], auditCoveredBy: ["notification_opened"] },
  { eventName: "daily_deadline_in_app_reminder_shown", label: "In-app deadline reminder shown", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications", "tasks"] },
  { eventName: "daily_deadline_in_app_reminder_opened", label: "In-app deadline reminder opened", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications", "tasks"] },
  { eventName: "daily_deadline_in_app_reminder_dismissed", label: "In-app deadline reminder dismissed", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications", "tasks"] },
  { eventName: "feedback_modal_opened", label: "Feedback modal opened", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks"] },
  { eventName: "feedback_submitted", label: "Feedback submitted", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks"], auditCoveredBy: ["bug_report_submitted"] },
  { eventName: "feature_flag_exposed", label: "Feature flag exposed", category: "system", sources: DEFAULT_CLIENT_SOURCES, modules: ["runtime"] },
  { eventName: "experiment_variant_exposed", label: "Experiment variant exposed", category: "system", sources: DEFAULT_CLIENT_SOURCES, modules: ["runtime"] },
  { eventName: "identity_linked", label: "Guest identity linked", category: "auth", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["auth", "engagement"], auditCoveredBy: ["auth_sign_in_success", "auth_sign_up_success"] },
  { eventName: "system_job_ran", label: "System job ran", category: "system", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["runtime"], auditCoveredBy: ["feature_flag_exposed"] },
  { eventName: "navigation_click", label: "Navigation click", category: "navigation", sources: DEFAULT_CLIENT_SOURCES, modules: ["navigation"] },
  { eventName: "beta_badge_clicked", label: "Beta badge clicked", category: "navigation", sources: DEFAULT_CLIENT_SOURCES, modules: ["navigation", "runtime"] },
  { eventName: "beta_changelog_opened", label: "Beta changelog opened", category: "navigation", sources: DEFAULT_CLIENT_SOURCES, modules: ["navigation", "runtime"] },
  { eventName: "beta_changelog_closed", label: "Beta changelog closed", category: "navigation", sources: DEFAULT_CLIENT_SOURCES, modules: ["navigation", "runtime"] },
  { eventName: "beta_changelog_entry_clicked", label: "Beta changelog entry clicked", category: "navigation", sources: DEFAULT_CLIENT_SOURCES, modules: ["navigation", "runtime"] },
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
  { eventName: "task_guidance_viewed", label: "Task guidance viewed", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks", "task_guidance"], aliases: ["task_guidance_banner_viewed"] },
  { eventName: "task_guidance_dismissed", label: "Task guidance dismissed", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks", "task_guidance"], aliases: ["task_guidance_banner_dismissed"] },
  { eventName: "task_guidance_tapped", label: "Task guidance tapped", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks", "task_guidance"], aliases: ["task_guidance_cta_clicked"] },
  { eventName: "task_guidance_completed", label: "Task guidance completed", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks", "task_guidance"] },
  { eventName: "task_card_expanded", label: "Task card expanded", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks", "task_guidance"] },
  { eventName: "task_help_opened", label: "Task help opened", category: "tasks", sources: DEFAULT_CLIENT_SOURCES, modules: ["tasks", "task_guidance"] },
  { eventName: "daily_task_assigned", label: "Daily task assigned", category: "tasks", sources: ["backend", "canonical"], modules: ["tasks"], aliases: ["task_assigned"] },
  { eventName: "daily_task_started", label: "Daily task started", category: "tasks", sources: ["backend", "canonical"], modules: ["tasks"], aliases: ["task_started"] },
  { eventName: "task_completed", label: "Task completed", category: "tasks", sources: ["backend", "canonical"], modules: ["tasks"], aliases: ["daily_task_completed"] },
  { eventName: "daily_task_failed", label: "Daily task failed", category: "tasks", sources: ["backend", "canonical"], modules: ["tasks"], aliases: ["task_failed"] },
  { eventName: "daily_task_deadline_reminder_sent", label: "Daily task reminder sent", category: "tasks", sources: ["backend", "canonical"], modules: ["tasks", "notifications"] },
  { eventName: "daily_deadline_browser_notification_shown", label: "Browser deadline notification shown", category: "notifications", sources: DEFAULT_CLIENT_SOURCES, modules: ["notifications", "tasks"] },
  { eventName: "promo_card_clicked", label: "Promo card clicked", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "collection_filter_changed", label: "Collection filter changed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "navigation"] },
  { eventName: "owned_drop_clicked", label: "Owned drop clicked", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "content"] },
  { eventName: "cookie_consent_updated", label: "Cookie consent updated", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "insufficient_balance_modal_closed", label: "Insufficient balance modal closed", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce"] },
  { eventName: "insufficient_balance_get_more_clicked", label: "Insufficient balance get more clicked", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce"] },
  { eventName: "featured_slide_viewed", label: "Featured slide viewed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "content"], aliases: ["featured_drop_viewed"] },
  { eventName: "featured_slide_clicked", label: "Featured slide clicked", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement", "content"], aliases: ["featured_drop_clicked"] },
  { eventName: "admin_chart_view_changed", label: "Admin chart view changed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin"] },
  { eventName: "admin_action_performed", label: "Admin action performed", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin"], auditCoveredBy: ["admin_analytics_viewed"] },
  { eventName: "asset_upload_started", label: "Asset upload started", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin"] },
  { eventName: "asset_upload_success", label: "Asset upload success", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin"] },
  { eventName: "asset_upload_failed", label: "Asset upload failed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin"] },
  { eventName: "admin_dashboard_viewed", label: "Admin dashboard viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_overview_viewed", label: "Admin overview viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_analytics_viewed", label: "Admin analytics viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_revenue_range_changed", label: "Admin revenue range changed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin"] },
  { eventName: "admin_top_drops_page_changed", label: "Admin top drops page changed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin"] },
  { eventName: "admin_top_drops_search", label: "Admin top drops searched", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin"] },
  { eventName: "admin_ai_viewed", label: "Admin AI viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_moderation_viewed", label: "Admin moderation viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation", "security"] },
  { eventName: "admin_moderation_alert_selected", label: "Admin moderation alert selected", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "security"] },
  { eventName: "admin_moderation_risk_action_clicked", label: "Admin moderation risk action clicked", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "security"] },
  { eventName: "admin_moderation_alert_reviewed", label: "Admin moderation alert reviewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "security"] },
  { eventName: "admin_moderation_alert_dismissed_false_positive", label: "Admin moderation false positive dismissed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "security"] },
  { eventName: "admin_moderation_alert_escalated", label: "Admin moderation alert escalated", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "security"] },
  { eventName: "admin_moderation_data_failed", label: "Admin moderation data failed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "security"], auditCoveredBy: ["admin_moderation_viewed"] },
    { eventName: "admin_debug_viewed", label: "Admin debug viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
    { eventName: "admin_support_viewed", label: "Admin support viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
    { eventName: "admin_users_viewed", label: "Admin users viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_content_viewed", label: "Admin content viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_drops_viewed", label: "Admin drops viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_privacy_viewed", label: "Admin privacy viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin"] },
  { eventName: "admin_queue_viewed", label: "Admin queue viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_roster_viewed", label: "Admin roster viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_roster_tab_changed", label: "Admin roster tab changed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "creator", "navigation"] },
  { eventName: "admin_creator_record_opened", label: "Admin creator record opened", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "creator"] },
  { eventName: "admin_creator_primary_action_clicked", label: "Admin creator primary action clicked", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "creator"] },
  { eventName: "admin_creator_section_expanded", label: "Admin creator section expanded", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "creator"] },
  { eventName: "admin_creator_audit_trail_opened", label: "Admin creator audit trail opened", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "creator", "onboarding"] },
  { eventName: "admin_creator_audit_event_expanded", label: "Admin creator audit event expanded", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "creator", "onboarding"] },
  { eventName: "admin_creator_action_executed", label: "Admin creator action executed", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_creator_account_updated", label: "Admin creator account updated", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_creator_email_updated", label: "Admin creator email updated", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_creator_password_reset_sent", label: "Admin creator password reset link created", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_creator_temporary_password_set", label: "Admin creator temporary password set", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_creator_role_updated", label: "Admin creator role updated", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_creator_status_updated", label: "Admin creator status updated", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_creator_experience_settings_opened", label: "Admin creator fan settings opened", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "creator"] },
  { eventName: "admin_creator_experience_settings_saved", label: "Admin creator fan settings saved", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_creator_experience_lane_toggled", label: "Admin creator fan lane toggled", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_creator_experience_pricing_updated", label: "Admin creator fan pricing updated", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_creator_experience_restriction_updated", label: "Admin creator fan restriction updated", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_creator_agreement_template_created", label: "Admin creator agreement template created", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "onboarding"] },
  { eventName: "admin_creator_agreement_template_activated", label: "Admin creator agreement template activated", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "onboarding"] },
  { eventName: "admin_creator_agreement_sent", label: "Admin creator agreement sent", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "onboarding"] },
  { eventName: "admin_creator_agreement_update_sent", label: "Admin creator agreement update sent", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "onboarding"] },
  { eventName: "admin_creator_agreement_countersigned", label: "Admin creator agreement countersigned", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "onboarding"] },
  { eventName: "admin_synthetic_creator_created", label: "Admin synthetic creator created", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_synthetic_creator_marked", label: "Admin synthetic creator marked", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_view_as_creator_started", label: "Admin view-as creator started", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_view_as_creator_ended", label: "Admin view-as creator ended", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"] },
  { eventName: "admin_projection_write_blocked", label: "Admin projection write blocked", category: "security", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "security"], aliases: ["admin_view_as_creator_action_blocked"] },
  { eventName: "admin_user_detail_viewed", label: "Admin user detail viewed", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "navigation"] },
  { eventName: "admin_ai_cover_toggle_updated", label: "Admin AI cover toggle updated", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "runtime"] },
  { eventName: "admin_ai_cover_generate_succeeded", label: "Admin AI cover generate succeeded", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "content", "runtime"] },
  { eventName: "admin_ai_cover_generate_failed", label: "Admin AI cover generate failed", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "content", "runtime"] },
  { eventName: "admin_ai_cover_generation_liked", label: "Admin AI cover generation liked", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "content", "runtime"] },
  { eventName: "admin_ai_cover_generation_disliked", label: "Admin AI cover generation disliked", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "content", "runtime"] },
  { eventName: "admin_ai_cover_generation_accepted", label: "Admin AI cover generation accepted", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "content", "runtime"] },
  { eventName: "admin_ai_cover_history_cleared", label: "Admin AI cover history cleared in modal", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "content"] },
  { eventName: "admin_ai_description_toggle_updated", label: "Admin AI description toggle updated", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "content", "runtime"] },
  { eventName: "admin_ai_description_generate_succeeded", label: "Admin AI description generate succeeded", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "content", "runtime"] },
  { eventName: "admin_ai_description_generate_failed", label: "Admin AI description generate failed", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "content", "runtime"] },
  { eventName: "admin_ai_description_generation_liked", label: "Admin AI description generation liked", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "content", "runtime"] },
  { eventName: "admin_ai_description_generation_disliked", label: "Admin AI description generation disliked", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "content", "runtime"] },
  { eventName: "admin_ai_description_generation_accepted", label: "Admin AI description generation accepted", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "content", "runtime"] },
  { eventName: "admin_ai_description_prompt_policy_updated", label: "Admin AI description prompt policy updated", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "content", "runtime"] },
  { eventName: "admin_ai_description_history_cleared", label: "Admin AI description history cleared in modal", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "content"] },
  { eventName: "admin_creator_created_directly", label: "Creator created directly from roster", category: "admin", sources: DEFAULT_CANONICAL_SERVER_SOURCES, modules: ["admin", "creator", "onboarding"] },
  { eventName: "creator_application_review_saved", label: "Creator application review saved", category: "admin", sources: DEFAULT_CLIENT_SOURCES, modules: ["admin", "creator"], auditCoveredBy: ["admin_creator_action_executed"] },
  { eventName: "heuristic_screenshot_shortcut_mac", label: "macOS screenshot shortcut blocked", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"], aliases: ["security_screenshot_mac_attempted"] },
  { eventName: "heuristic_screenshot_shortcut_windows", label: "Windows snipping shortcut blocked", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"], aliases: ["security_screenshot_windows_attempted", "security_screenshot_attempted"] },
  { eventName: "heuristic_screen_record_shortcut", label: "Capture shortcut blocked", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"], aliases: ["security_screen_record_attempted"] },
  { eventName: "heuristic_devtools_shortcut", label: "Developer tools shortcut blocked", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"], aliases: ["security_devtools_attempted", "security_source_view_attempted"] },
  { eventName: "heuristic_rapid_visibility_capture", label: "Rapid hide/show capture pattern detected", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"], aliases: ["security_capture_pattern_detected"] },
  { eventName: "heuristic_rip_pattern", label: "Repeated extraction pattern detected", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
  { eventName: "heuristic_unknown_threat", label: "Viewer protection warning", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
  { eventName: "confirmed_print_attempt", label: "Print attempt blocked", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"], aliases: ["security_print_attempted"] },
  { eventName: "confirmed_save_attempt", label: "Save shortcut blocked", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"], aliases: ["security_save_attempted"] },
  { eventName: "confirmed_copy_attempt", label: "Copy attempt blocked", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"], aliases: ["security_copy_attempted"] },
  { eventName: "confirmed_cut_attempt", label: "Cut attempt blocked", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"] },
  { eventName: "confirmed_selection_attempt", label: "Selection attempt blocked", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"], aliases: ["security_selection_attempted"] },
  { eventName: "confirmed_drag_attempt", label: "Drag export attempt blocked", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"], aliases: ["security_drag_export_attempted"] },
  { eventName: "confirmed_context_menu_attempt", label: "Context menu attempt blocked", category: "security", sources: DEFAULT_SERVER_SOURCES, modules: ["security", "viewer"], aliases: ["security_context_menu_attempted"] },
  { eventName: "library_search", label: "Library searched", category: "navigation", sources: DEFAULT_CLIENT_SOURCES, modules: ["navigation"] },
  { eventName: "drops_category_selected", label: "Drops category selected", category: "navigation", sources: DEFAULT_CLIENT_SOURCES, modules: ["navigation"] },
  { eventName: "drops_searched", label: "Drops searched", category: "navigation", sources: DEFAULT_CLIENT_SOURCES, modules: ["navigation"] },
  { eventName: "recent_activity_page_changed", label: "Recent activity page changed", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "recent_activity_searched", label: "Recent activity searched", category: "engagement", sources: DEFAULT_CLIENT_SOURCES, modules: ["engagement"] },
  { eventName: "unlock_drop_failed", label: "Unlock drop failed", category: "commerce", sources: DEFAULT_CLIENT_SOURCES, modules: ["commerce"] },
];

function buildTelemetryModuleEventNames(moduleKey: TelemetryModuleKey) {
  return TELEMETRY_EVENT_OPTIONS
    .filter((event) => event.modules?.includes(moduleKey))
    .map((event) => event.eventName);
}

export const TELEMETRY_MODULE_INDEXES: TelemetryModuleIndex[] = [
  {
    key: "auth",
    label: "Auth",
    eventNames: buildTelemetryModuleEventNames("auth"),
    fallbackSources: ["analytics_event_facts", "ga4"],
  },
  {
    key: "onboarding",
    label: "Onboarding",
    eventNames: buildTelemetryModuleEventNames("onboarding"),
    fallbackSources: ["analytics_event_facts", "ga4"],
  },
  {
    key: "navigation",
    label: "Navigation",
    eventNames: buildTelemetryModuleEventNames("navigation"),
    fallbackSources: ["analytics_page_daily", "ga4", "analytics_event_facts"],
  },
  {
    key: "notifications",
    label: "Notifications",
    eventNames: buildTelemetryModuleEventNames("notifications"),
    fallbackSources: ["analytics_event_facts", "ga4"],
  },
  {
    key: "tasks",
    label: "Daily Tasks",
    eventNames: buildTelemetryModuleEventNames("tasks"),
    fallbackSources: ["daily_task_events", "analytics_task_daily", "analytics_event_facts"],
  },
  {
    key: "task_guidance",
    label: "Task Guidance",
    eventNames: buildTelemetryModuleEventNames("task_guidance"),
    fallbackSources: ["analytics_event_facts", "ga4"],
  },
  {
    key: "commerce",
    label: "Commerce",
    eventNames: buildTelemetryModuleEventNames("commerce"),
    fallbackSources: ["transactions", "analytics_commerce_daily", "analytics_event_facts", "ga4"],
  },
  {
    key: "content",
    label: "Content",
    eventNames: buildTelemetryModuleEventNames("content"),
    fallbackSources: ["analytics_drop_daily", "analytics_event_facts", "transactions", "ga4"],
  },
  {
    key: "viewer",
    label: "Viewer",
    eventNames: buildTelemetryModuleEventNames("viewer"),
    fallbackSources: ["analytics_watch_sessions", "analytics_watch_assets", "analytics_session_facts", "analytics_event_facts", "ga4"],
  },
  {
    key: "creator",
    label: "Creator Experiences",
    eventNames: buildTelemetryModuleEventNames("creator"),
    fallbackSources: ["analytics_event_facts", "creator_relationships", "creator_subscriptions", "creator_message_threads", "creator_custom_requests", "creator_call_bookings", "creator_ledger_accruals"],
  },
  {
    key: "engagement",
    label: "Engagement",
    eventNames: buildTelemetryModuleEventNames("engagement"),
    fallbackSources: ["analytics_page_daily", "analytics_guest_batches", "ga4"],
  },
  {
    key: "admin",
    label: "Admin",
    eventNames: buildTelemetryModuleEventNames("admin"),
    fallbackSources: ["analytics_event_facts", "ga4"],
  },
  {
    key: "runtime",
    label: "Runtime",
    eventNames: buildTelemetryModuleEventNames("runtime"),
    fallbackSources: ["analytics_event_facts"],
  },
  {
    key: "security",
    label: "Security",
    eventNames: buildTelemetryModuleEventNames("security"),
    fallbackSources: ["security_events", "analytics_event_facts"],
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
  "admin_overview_viewed",
  "admin_revenue_range_changed",
  "admin_top_drops_page_changed",
  "admin_top_drops_search",
  "admin_analytics_viewed",
  "admin_ai_viewed",
  "admin_moderation_viewed",
  "admin_moderation_alert_selected",
  "admin_moderation_risk_action_clicked",
  "admin_moderation_alert_reviewed",
  "admin_moderation_alert_dismissed_false_positive",
  "admin_moderation_alert_escalated",
  "admin_moderation_data_failed",
  "admin_debug_viewed",
  "admin_users_viewed",
  "admin_content_viewed",
  "admin_drops_viewed",
  "admin_queue_viewed",
  "admin_roster_viewed",
  "admin_roster_tab_changed",
  "admin_creator_record_opened",
  "admin_creator_primary_action_clicked",
  "admin_creator_section_expanded",
  "admin_creator_audit_trail_opened",
  "admin_creator_audit_event_expanded",
  "admin_creator_action_executed",
  "admin_creator_account_updated",
  "admin_creator_email_updated",
  "admin_creator_password_reset_sent",
  "admin_creator_temporary_password_set",
  "admin_creator_role_updated",
  "admin_creator_status_updated",
  "admin_creator_experience_settings_opened",
  "admin_creator_experience_settings_saved",
  "admin_creator_experience_lane_toggled",
  "admin_creator_experience_pricing_updated",
  "admin_creator_experience_restriction_updated",
  "admin_creator_agreement_template_created",
  "admin_creator_agreement_template_activated",
  "admin_creator_agreement_sent",
  "admin_creator_agreement_update_sent",
  "admin_creator_agreement_countersigned",
  "admin_synthetic_creator_created",
  "admin_synthetic_creator_marked",
  "admin_view_as_creator_started",
  "admin_view_as_creator_ended",
  "admin_projection_write_blocked",
  "admin_user_detail_viewed",
  "admin_privacy_viewed",
  "admin_ai_cover_toggle_updated",
  "admin_ai_cover_generate_succeeded",
  "admin_ai_cover_generate_failed",
  "admin_ai_cover_generation_liked",
  "admin_ai_cover_generation_disliked",
  "admin_ai_cover_generation_accepted",
  "admin_ai_cover_history_cleared",
  "admin_ai_description_toggle_updated",
  "admin_ai_description_generate_succeeded",
  "admin_ai_description_generate_failed",
  "admin_ai_description_generation_liked",
  "admin_ai_description_generation_disliked",
  "admin_ai_description_generation_accepted",
  "admin_ai_description_prompt_policy_updated",
  "admin_creator_created_directly",
  "creator_application_review_saved",
  "creator_agreement_viewed",
  "creator_agreement_section_opened",
  "creator_agreement_acknowledgement_checked",
  "creator_agreement_signed",
  "creator_application_updated",
  "creator_intro_acknowledged",
  "creator_legally_cleared_override",
  "creator_contract_signed",
  "creator_legal_sent",
  "creator_legal_signed",
  "creator_id_requested",
  "creator_id_verified",
  "creator_id_rejected",
  "creator_segment_assigned",
  "creator_role_activated",
  "creator_role_activation_blocked",
  "owner_override_applied",
  "owner_override_cleared",
  "creator_approved",
  "creator_rejected",
  "creator_needs_changes",
  "creator_profile_link_clicked",
  "creator_profile_link_missing",
  "navigation_click",
  "viewer_opened",
  "viewer_content_loaded",
  "viewer_session_started",
  "viewer_session_completed",
  "watch_session_started",
  "watch_session_visible_tick",
  "watch_session_progress",
  "watch_session_paused",
  "watch_session_resumed",
  "watch_session_hidden",
  "watch_session_ended",
  "watch_score_computed",
  "file_viewed",
  "viewer_asset_completed",
  "viewer_source_downloaded",
  "viewer_related_drop_clicked",
] as const;

export function normalizeTelemetryEventName(eventName: string) {
  const trimmedEventName = eventName.trim();
  const lowerCaseEventName = trimmedEventName.toLowerCase();

  return TELEMETRY_EVENT_ALIAS_MAP[trimmedEventName]
    || TELEMETRY_EVENT_ALIAS_MAP[lowerCaseEventName]
    || (TELEMETRY_EVENT_NAME_SET.has(lowerCaseEventName) ? lowerCaseEventName : trimmedEventName);
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

const TELEMETRY_PARAM_ALIASES: Record<string, string> = {
  adminId: "admin_id",
  anonymousVisitorId: "anonymous_visitor_id",
  appVersion: "app_version",
  actionKey: "action_key",
  actorAdminId: "actor_admin_id",
  actorClassificationReason: "actor_classification_reason",
  actorCreatorId: "actor_creator_id",
  actorEmail: "actor_email",
  actorRole: "actor_role",
  actorType: "actor_type",
  actorUid: "actor_uid",
  actorUserId: "actor_user_id",
  acknowledgementChecked: "acknowledgement_checked",
  acknowledgementKey: "acknowledgement_key",
  agreementHash: "agreement_hash",
  agreementVersion: "agreement_version",
  assetIndex: "asset_index",
  assetKey: "asset_key",
  componentName: "component_name",
  contentKind: "content_kind",
  completionQuality: "completion_quality",
  creatorId: "creator_id",
  dayKey: "day_key",
  dropCategory: "drop_category",
  dropId: "drop_id",
  dropTags: "drop_tags",
  dropTitle: "drop_title",
  dispatchId: "dispatch_id",
  durationMs: "duration_ms",
  entitlementId: "entitlement_id",
  fileId: "file_id",
  activeMs: "active_ms",
  eventIndexVersion: "event_index_version",
  eventModules: "event_modules",
  hourKey: "hour_key",
  idempotencyKey: "idempotency_key",
  intakeVersion: "intake_version",
  isMobileViewport: "is_mobile_viewport",
  messageId: "message_id",
  mediaIndex: "media_index",
  mediaType: "media_type",
  minuteKey: "minute_key",
  notificationId: "notification_id",
  notificationType: "notification_type",
  orderId: "order_id",
  pagePath: "page_path",
  performedAs: "performed_as",
  projectionMode: "projection_mode",
  projectionScope: "projection_scope",
  purchaseId: "purchase_id",
  recommendationId: "recommendation_id",
  recommendationReason: "recommendation_reason",
  recipientId: "recipient_id",
  semanticScopeLabel: "semantic_scope_label",
  sessionId: "session_id",
  sessionWatchSeconds: "session_watch_seconds",
  selectedGoals: "selected_goals",
  explicitRating: "explicit_rating",
  feedbackRecency: "feedback_recency",
  lowRefundRisk: "low_refund_risk",
  repeatCreatorInterest: "repeat_creator_interest",
  satisfactionScore: "satisfaction_score",
  satisfactionLabel: "satisfaction_label",
  suppressionScore: "suppression_score",
  rewardGd: "reward_gd",
  sourceComponent: "source_component",
  sourceTruth: "source_truth",
  includeInUserBehavior: "include_in_user_behavior",
  metricEligible: "metric_eligible",
  metricExclusionReason: "metric_exclusion_reason",
  stepKey: "step_key",
  taskId: "task_id",
  taskKey: "task_key",
  targetCreatorId: "target_creator_id",
  targetUserId: "target_user_id",
  threadId: "thread_id",
  transactionId: "transaction_id",
  unknownActorBlocked: "unknown_actor_blocked",
  userId: "user_id",
  viewportHeight: "viewport_height",
  viewportVisiblePercent: "viewport_visible_percent",
  viewportWidth: "viewport_width",
  watchSessionId: "watch_session_id",
  viewerSessionId: "viewer_session_id",
  validWatchMs: "valid_watch_ms",
  visibleMs: "visible_ms",
  playingMs: "playing_ms",
  hiddenMs: "hidden_ms",
  idleMs: "idle_ms",
  reasonCodes: "reason_codes",
  releaseChannel: "release_channel",
  currentVersion: "current_version",
  latestNoteCommittedAtUtc: "latest_note_committed_at_utc",
  latestNoteCommitSha: "latest_note_commit_sha",
  releaseNotesFreshnessState: "release_notes_freshness_state",
  releaseNotesSource: "release_notes_source",
  watchSeconds: "watch_seconds",
};

export function normalizeTelemetryEventPayloadParams(eventParams?: Record<string, unknown>) {
  if (!eventParams) {
    return undefined;
  }

  const normalizedParams: Record<string, unknown> = { ...eventParams };
  Object.entries(TELEMETRY_PARAM_ALIASES).forEach(([aliasKey, canonicalKey]) => {
    if (
      Object.prototype.hasOwnProperty.call(eventParams, aliasKey)
      && !Object.prototype.hasOwnProperty.call(normalizedParams, canonicalKey)
    ) {
      normalizedParams[canonicalKey] = eventParams[aliasKey];
    }
  });

  return normalizedParams;
}

function isPageViewEvent(eventName: string) {
  return eventName === "page_viewed"
    || eventName.startsWith("semantic_page_")
    || eventName.endsWith("_page_viewed")
    || eventName.endsWith("_viewed");
}

function isDropEvent(eventName: string) {
  return eventName.includes("drop")
    || eventName === "file_viewed"
    || eventName.startsWith("content_satisfaction_")
    || eventName.startsWith("recommendation_reason_")
    || eventName.includes("viewer_")
    || eventName.startsWith("watch_session")
    || eventName === "watch_score_computed"
    || eventName === "spend_virtual_currency";
}

function isUnlockEvent(eventName: string) {
  return eventName.includes("unlock")
    || eventName.includes("unwrap");
}

function isPurchaseEvent(eventName: string) {
  return eventName.includes("purchase")
    || eventName.includes("checkout")
    || eventName.includes("wallet")
    || eventName.includes("subscription")
    || eventName.includes("cashout")
    || eventName.includes("ledger_accrual");
}

function isNotificationEvent(eventName: string) {
  return eventName.includes("notification")
    || eventName.includes("reminder")
    || eventName === "queued_drop_returned_live";
}

function isAuthEvent(eventName: string) {
  return eventName.startsWith("auth_")
    || eventName.includes("password_reset")
    || eventName === "user_registered"
    || eventName === "identity_linked";
}

function isChatEvent(eventName: string) {
  return eventName === "creator_message_sent"
    || eventName === "creator_media_sent"
    || eventName === "chat_message_send_attempted"
    || eventName === "chat_message_send_failed"
    || eventName === "chat_message_sent";
}

function isOnboardingEvent(eventName: string, option?: TelemetryEventOption) {
  return eventName.includes("onboarding")
    || eventName.includes("creator_id_")
    || eventName.includes("creator_legal")
    || option?.modules?.includes("onboarding") === true;
}

export function classifyTelemetryEventFamily(
  eventName: string,
  option = TELEMETRY_EVENT_OPTIONS_BY_NAME[normalizeTelemetryEventName(eventName)],
): TelemetryEventFamily {
  const canonicalEventName = normalizeTelemetryEventName(eventName);

  if (option?.category === "admin" || canonicalEventName.startsWith("admin_")) {
    return "admin";
  }
  if (option?.category === "security" || canonicalEventName.startsWith("security_") || canonicalEventName.startsWith("confirmed_") || canonicalEventName.startsWith("heuristic_")) {
    return "security";
  }
  if (option?.category === "system" || canonicalEventName.startsWith("system_") || canonicalEventName.includes("runtime")) {
    return "system";
  }
  if (isChatEvent(canonicalEventName)) {
    return "chat_message";
  }
  if (isNotificationEvent(canonicalEventName)) {
    return "notification";
  }
  if (isUnlockEvent(canonicalEventName)) {
    return "unlock";
  }
  if (isPurchaseEvent(canonicalEventName)) {
    return "purchase";
  }
  if (option?.modules?.includes("tasks") || canonicalEventName.includes("task") || canonicalEventName.includes("check_in")) {
    return "task";
  }
  if (isAuthEvent(canonicalEventName)) {
    return "auth";
  }
  if (isOnboardingEvent(canonicalEventName, option)) {
    return "onboarding";
  }
  if (option?.modules?.includes("creator") || canonicalEventName.startsWith("creator_") || canonicalEventName.includes("creator_")) {
    return "creator";
  }
  if (isDropEvent(canonicalEventName)) {
    return "drop";
  }
  if (isPageViewEvent(canonicalEventName)) {
    return "page_view";
  }

  return "engagement";
}

function buildRequiredObjectFields(eventName: string, family: TelemetryEventFamily) {
  if (eventName === "drop_card_impression") {
    return [
      "drop_id|dropId",
      "impression_session_id|impressionSessionId|session_id|sessionId",
      "surface|impression_surface|source_component|sourceComponent",
    ];
  }

  if (eventName === "featured_slide_viewed" || eventName === "featured_slide_clicked") {
    return [
      "drop_id|dropId",
      "position|featured_rank|featuredRank",
    ];
  }

  if (eventName === "creator_rail_impression") {
    return [
      "creator_id|creatorId|target_creator_id|targetCreatorId",
      "position",
    ];
  }

  if (eventName === "drops_searched" || eventName === "drops_category_selected") {
    return [
      "query",
      "category",
      "sort",
    ];
  }

  if (eventName === "search_query_submitted") {
    return [
      "normalized_query_tokens|normalizedQueryTokens",
      "query_length|queryLength",
      "intent_class|intentClass",
    ];
  }

  if (eventName === "filter_selected") {
    return ["filter_key|filterKey", "filter_value|filterValue|category"];
  }

  if (eventName === "sort_changed") {
    return ["sort|sort_key|sortKey"];
  }

  if (eventName === "category_clicked") {
    return ["category|category_id|categoryId|drop_category|dropCategory"];
  }

  if (eventName === "creator_search_selected") {
    return ["creator_id|creatorId|target_creator_id|targetCreatorId"];
  }

  if (eventName.startsWith("content_satisfaction_")) {
    return [
      "drop_id|dropId|target_drop_id|targetDropId",
      "asset_key|assetKey|media_index|mediaIndex",
      "satisfaction_score|satisfactionScore|explicit_rating|explicitRating",
    ];
  }

  if (eventName === "recommendation_reason_helpful" || eventName === "recommendation_reason_not_helpful") {
    return [
      "recommendation_id|recommendationId|drop_id|dropId|target_drop_id|targetDropId",
      "recommendation_reason|recommendationReason",
    ];
  }

  if (eventName === "drop_not_interested" || eventName === "recommendation_dismissed") {
    return [
      "drop_id|dropId|target_drop_id|targetDropId",
      "recommendation_id|recommendationId|surface|source_component|sourceComponent",
    ];
  }

  if (eventName === "creator_not_interested" || eventName === "creator_muted") {
    return ["creator_id|creatorId|target_creator_id|targetCreatorId"];
  }

  if (eventName === "category_not_interested") {
    return ["category|category_id|categoryId|drop_category|dropCategory"];
  }

  if (
    eventName === "admin_view_as_creator_started"
    || eventName === "admin_view_as_creator_ended"
    || eventName === "admin_projection_write_blocked"
  ) {
    return ["target_user_id|targetUserId", "target_creator_id|targetCreatorId"];
  }

  if (eventName.startsWith("watch_session") || eventName === "watch_score_computed") {
    return ["drop_id|dropId", "watch_session_id|watchSessionId"];
  }

  if (eventName === "file_viewed") {
    return [
      "drop_id|dropId",
      "file_id|fileId|asset_key|assetKey",
      "media_index|mediaIndex",
      "viewer_session_id|viewerSessionId|watch_session_id|watchSessionId",
    ];
  }

  if (family === "unlock") {
    return [
      "drop_id|dropId",
      "transaction_id|transactionId|dedupeKey|idempotency_key|idempotencyKey",
    ];
  }

  if (eventName === "purchase" || eventName === "purchase_verified" || eventName.startsWith("gumdrops_purchase_") || eventName === "begin_checkout") {
    return [
      "purchase_id|purchaseId|order_id|orderId|transaction_id|transactionId",
      "amount|value|package_price|source|payment_source|purchase_source",
    ];
  }

  if (family === "notification" && !eventName.includes("prompt")) {
    return [
      "notification_id|notificationId|idempotency_key|idempotencyKey|tag",
      "notification_type|notificationType|type|lifecycle_event|lifecycleEvent",
    ];
  }

  if (family === "chat_message") {
    return [
      "conversation_id|conversationId|thread_id|threadId",
      "message_id|messageId|idempotency_key|idempotencyKey",
    ];
  }

  if (eventName === "task_completed") {
    return [
      "task_id|taskId|task_key|taskKey",
      "reward_gd|rewardGd|gum_drops_awarded|reward",
    ];
  }

  if (
    eventName === "support_ticket_created"
    || eventName === "support_reply_viewed"
    || eventName === "support_reply_sent"
    || eventName === "support_thread_opened"
    || eventName === "support_thread_reply_failed"
    || eventName === "bug_report_submitted"
  ) {
    return [
      "thread_id|threadId|ticket_id|ticketId|feedback_id|feedbackId",
      "category|support_category|issue_type|issueType",
    ];
  }

  if (family === "task") {
    return ["task_id|taskId|task_key|taskKey"];
  }

  if (family === "drop" || eventName.includes("drop")) {
    return ["drop_id|dropId"];
  }

  return [];
}

function buildRequiredActorFields(eventName: string, family: TelemetryEventFamily) {
  if (
    eventName === "admin_view_as_creator_started"
    || eventName === "admin_view_as_creator_ended"
    || eventName === "admin_projection_write_blocked"
  ) {
    return ["actor_admin_id|actorAdminId|admin_id|adminId", "performed_as|performedAs"];
  }

  if (family === "admin") {
    return ["actor_admin_id|actorAdminId|admin_id|adminId"];
  }

  if (family === "unlock" || eventName === "purchase_verified" || eventName.startsWith("gumdrops_purchase_")) {
    return ["user_id|userId|authenticated caller"];
  }

  if (family === "purchase" && eventName !== "purchase_package_selected" && eventName !== "wallet_opened" && eventName !== "wallet_closed_incomplete") {
    return ["user_id|userId|authenticated caller"];
  }

  if (family === "notification" && !eventName.includes("prompt")) {
    return ["recipient_id|recipientId|user_id|userId|target audience"];
  }

  if (family === "chat_message") {
    return ["user_id|userId|authenticated caller"];
  }

  if (
    eventName === "support_ticket_created"
    || eventName === "support_reply_viewed"
    || eventName === "support_reply_sent"
    || eventName === "bug_report_submitted"
  ) {
    return ["user_id|userId|authenticated caller"];
  }

  if (family === "auth") {
    return ["session_id|sessionId|anonymous_visitor_id|anonymousVisitorId|user_id|userId"];
  }

  return [];
}

function buildRequiredSurfaceFields(eventName: string, family: TelemetryEventFamily) {
  if (
    eventName === "drop_card_impression"
    || eventName === "featured_slide_viewed"
    || eventName === "featured_slide_clicked"
    || eventName === "creator_rail_impression"
    || eventName === "drops_searched"
    || eventName === "drops_category_selected"
    || eventName === "search_query_submitted"
    || eventName === "filter_selected"
    || eventName === "sort_changed"
    || eventName === "category_clicked"
    || eventName === "creator_search_selected"
    || eventName.startsWith("content_satisfaction_")
    || eventName === "recommendation_reason_helpful"
    || eventName === "recommendation_reason_not_helpful"
    || eventName === "drop_not_interested"
    || eventName === "creator_not_interested"
    || eventName === "category_not_interested"
    || eventName === "creator_muted"
    || eventName === "recommendation_dismissed"
  ) {
    return ["route|page_path|pagePath|surface|source_component|sourceComponent"];
  }

  const requiresSurface = family === "drop"
    || family === "unlock"
    || family === "purchase"
    || family === "auth"
    || family === "onboarding"
    || family === "page_view";

  if (!requiresSurface) {
    return [];
  }

  if (family === "auth") {
    return ["method|provider", "outcome|success|error_code", "route|page_path|pagePath|surface|source_component"];
  }

  if (eventName === "purchase_verified") {
    return ["source|payment_source|purchase_source|tracking_origin"];
  }

  if (
    eventName === "support_ticket_created"
    || eventName === "support_reply_viewed"
    || eventName === "support_reply_sent"
    || eventName === "bug_report_submitted"
  ) {
    return ["route|page_path|pagePath|surface|source_component|sourceComponent"];
  }

  return ["route|page_path|pagePath|surface|source_component|sourceComponent"];
}

export function buildTelemetryEventPayloadContract(eventName: string): TelemetryEventPayloadContract {
  const canonicalEventName = normalizeTelemetryEventName(eventName);
  const option = TELEMETRY_EVENT_OPTIONS_BY_NAME[canonicalEventName];
  const family = classifyTelemetryEventFamily(canonicalEventName, option);
  const requiredActorFields = buildRequiredActorFields(canonicalEventName, family);
  const requiredObjectFields = buildRequiredObjectFields(canonicalEventName, family);
  const requiredSurfaceFields = buildRequiredSurfaceFields(canonicalEventName, family);
  const dedupeKeyRequired = family === "unlock"
    || family === "notification"
    || family === "chat_message"
    || canonicalEventName === "drop_card_impression"
    || canonicalEventName === "featured_slide_viewed"
    || canonicalEventName === "creator_rail_impression"
    || canonicalEventName === "purchase_verified"
    || canonicalEventName.startsWith("gumdrops_purchase_");
  const highRiskFamilies: TelemetryEventFamily[] = ["unlock", "purchase", "notification", "admin"];

  return {
    eventName: canonicalEventName,
    aliases: option?.aliases ?? [],
    version: 1,
    family,
    requiredActorFields,
    requiredObjectFields,
    requiredSurfaceFields,
    dedupeKeyRequired,
    guestAllowed: family !== "admin" && family !== "unlock" && canonicalEventName !== "purchase_verified",
    adminExcludedFromUserAnalytics: family === "admin",
    legacyDeprecated: false,
    missingFieldsRisk: requiredActorFields.length + requiredObjectFields.length + requiredSurfaceFields.length === 0
      ? "low"
      : highRiskFamilies.includes(family)
        ? "high"
        : "medium",
  };
}

export const TELEMETRY_EVENT_PAYLOAD_CONTRACTS = TELEMETRY_EVENT_OPTIONS.map((event) =>
  buildTelemetryEventPayloadContract(event.eventName),
);

export const TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME = Object.fromEntries(
  TELEMETRY_EVENT_PAYLOAD_CONTRACTS.map((contract) => [contract.eventName, contract]),
) as Record<string, TelemetryEventPayloadContract>;
