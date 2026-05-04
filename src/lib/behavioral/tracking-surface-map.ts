export type TrackingSurfaceCoverageWeight = 10 | 12 | 13 | 15 | 18;

export type TrackingSurfaceDefinition = {
  id: string;
  label: string;
  weight: TrackingSurfaceCoverageWeight;
  files: string[];
  critical: boolean;
  events: string[];
  requiredFields: string[];
  serverTruthEvents?: string[];
};

export const TRACKING_SURFACE_MAP: TrackingSurfaceDefinition[] = [
  {
    id: "home_auth_onboarding",
    label: "Home, auth, and onboarding",
    weight: 10,
    critical: true,
    files: [
      "src/app/page.tsx",
      "src/app/HomeClient.tsx",
      "src/components/Hero.tsx",
      "src/components/Landing/HomeHeroActions.tsx",
      "src/components/Auth/AuthModal.tsx",
      "src/components/CreatorDiscoveryRail.tsx",
      "src/lib/telemetry.ts",
    ],
    events: [
      "home_page_viewed",
      "hero_cta_clicked",
      "auth_sign_up_attempted",
      "auth_sign_up_success",
      "guided_onboarding_started",
      "guided_onboarding_completed",
      "creator_spotlight_viewed",
    ],
    requiredFields: ["source_component", "route"],
  },
  {
    id: "dashboard_tasks",
    label: "Dashboard and tasks",
    weight: 10,
    critical: false,
    files: [
      "src/app/dashboard/page.tsx",
      "src/components/Dashboard/DailyCheckIn.tsx",
      "src/components/Dashboard/DailyTasksModule.tsx",
    ],
    events: ["daily_check_in_claim", "daily_task_action_clicked"],
    requiredFields: ["source_component", "task_id"],
  },
  {
    id: "drops_preview_viewer",
    label: "Drops, preview, and viewer",
    weight: 18,
    critical: true,
    files: [
      "src/components/DropCard.tsx",
      "src/hooks/useDropCardImpression.ts",
      "src/components/FeaturedCarousel.tsx",
      "src/components/Drops/LockedDropPreviewView.tsx",
      "src/components/Drops/LockedDropPreviewClient.tsx",
      "src/hooks/useViewerWatchSession.ts",
      "src/app/dashboard/viewer/adapters/ViewerTelemetryAdapter.ts",
      "src/app/api/viewer/watch-session/route.ts",
      "src/app/api/drops/unlock/route.ts",
    ],
    events: [
      "drop_card_impression",
      "featured_drop_viewed",
      "featured_drop_clicked",
      "drop_preview_opened",
      "drop_preview_cta_clicked",
      "drop_unlock_attempted",
      "unlock_drop_success",
      "watch_session_started",
      "watch_session_visible_tick",
      "watch_session_ended",
      "viewer_asset_started",
    ],
    requiredFields: ["source_component", "drop_id", "file_id"],
    serverTruthEvents: ["unlock_drop_success"],
  },
  {
    id: "wallet_payments",
    label: "Wallet and payments",
    weight: 15,
    critical: true,
    files: [
      "src/components/PurchaseModal.tsx",
      "src/app/api/paypal/capture/route.ts",
      "src/lib/server/analytics.ts",
    ],
    events: [
      "wallet_opened",
      "purchase_package_selected",
      "begin_checkout",
      "gumdrops_purchase_completed",
      "gumdrops_purchase_failed",
      "purchase_verified",
    ],
    requiredFields: ["source_component", "transaction_id", "value_usd", "gumdrops_amount"],
    serverTruthEvents: ["purchase_verified", "gumdrops_purchase_completed"],
  },
  {
    id: "creator_profile_monetization",
    label: "Creator profile and monetization",
    weight: 12,
    critical: false,
    files: [
      "src/components/CreatorDiscoveryRail.tsx",
      "src/components/Creators/CreatorExperiencesPanel.tsx",
      "src/app/creators/[username]/CreatorProfileClient.tsx",
      "src/lib/server/creator-experiences.ts",
      "src/app/api/creator/bookings/route.ts",
    ],
    events: [
      "creator_profile_link_clicked",
      "creator_followed",
      "creator_unfollowed",
      "creator_fan_pass_started",
      "creator_custom_request_created",
      "creator_call_booking_created",
      "creator_call_booking_completed",
    ],
    requiredFields: ["source_component", "creator_id"],
  },
  {
    id: "chat_notifications_support",
    label: "Chat, notifications, and support",
    weight: 12,
    critical: false,
    files: [
      "src/components/Chat/ChatExperience.tsx",
      "src/components/Navigation/NotificationBell.tsx",
      "src/components/Support/SupportInbox.tsx",
    ],
    events: [
      "chat_thread_opened",
      "chat_message_sent",
      "chat_message_send_failed",
      "notification_opened",
      "notification_marked_read",
      "notification_action_clicked",
      "support_ticket_submitted",
      "support_thread_opened",
      "support_thread_replied",
      "support_thread_reply_failed",
    ],
    requiredFields: ["source_component", "thread_id", "notification_id"],
  },
  {
    id: "admin_users_projection",
    label: "Admin users and projection",
    weight: 10,
    critical: false,
    files: [
      "src/app/admin/users/page.tsx",
      "src/context/AdminViewAsContext.tsx",
      "src/app/api/admin/view-as-creator/route.ts",
    ],
    events: [
      "admin_users_viewed",
      "admin_user_detail_viewed",
      "admin_view_as_creator_started",
      "admin_view_as_creator_ended",
      "admin_view_as_creator_action_blocked",
    ],
    requiredFields: ["source_component", "target_user_id"],
  },
  {
    id: "moderation_security",
    label: "Moderation and security",
    weight: 13,
    critical: true,
    files: [
      "src/lib/security-events.ts",
      "src/lib/moderation/theft-risk-evidence.ts",
      "src/app/api/admin/moderation/security-alerts/route.ts",
      "src/app/api/security/log-attempt/route.ts",
    ],
    events: [
      "confirmed_context_menu_attempt",
      "confirmed_copy_attempt",
      "heuristic_rapid_visibility_capture",
    ],
    requiredFields: ["drop_id", "file_id", "reason_code"],
  },
];

export const TRACKING_SURFACE_SCORE_TOTAL = TRACKING_SURFACE_MAP.reduce((sum, surface) => sum + surface.weight, 0);
