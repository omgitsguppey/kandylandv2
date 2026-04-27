export const ROUTE_RUNTIME_HEALTH_COLLECTION = "route_runtime_health";

export const ROUTE_RUNTIME_HEALTH_TARGETS = {
    "__/auth/[...path]:GET": {
        routeName: "__/auth/[...path]",
        method: "GET",
        title: "Firebase Auth Proxy GET",
        slowThresholdMs: 1200,
    },
    "__/auth/[...path]:POST": {
        routeName: "__/auth/[...path]",
        method: "POST",
        title: "Firebase Auth Proxy POST",
        slowThresholdMs: 1200,
    },
    "__/auth/[...path]:HEAD": {
        routeName: "__/auth/[...path]",
        method: "HEAD",
        title: "Firebase Auth Proxy HEAD",
        slowThresholdMs: 1200,
    },
    "__/firebase/[...path]:GET": {
        routeName: "__/firebase/[...path]",
        method: "GET",
        title: "Firebase Proxy GET",
        slowThresholdMs: 1200,
    },
    "__/firebase/[...path]:HEAD": {
        routeName: "__/firebase/[...path]",
        method: "HEAD",
        title: "Firebase Proxy HEAD",
        slowThresholdMs: 1200,
    },
    "admin/debug:GET": {
        routeName: "admin/debug",
        method: "GET",
        title: "Admin debug snapshot",
        slowThresholdMs: 1800,
    },
    "admin/debug/assistant:GET": {
        routeName: "admin/debug/assistant",
        method: "GET",
        title: "Admin debug assistant summary",
        slowThresholdMs: 5000,
    },
    "admin/debug/assistant/fix:POST": {
        routeName: "admin/debug/assistant/fix",
        method: "POST",
        title: "Admin debug assistant auto-fix",
        slowThresholdMs: 15000,
    },
    "admin/debug/assistant:PUT": {
        routeName: "admin/debug/assistant",
        method: "PUT",
        title: "Admin debug assistant settings writes",
        slowThresholdMs: 1400,
    },
    "admin/debug/preferences:GET": {
        routeName: "admin/debug/preferences",
        method: "GET",
        title: "Admin debug preferences reads",
        slowThresholdMs: 1000,
    },
    "admin/debug/preferences:PUT": {
        routeName: "admin/debug/preferences",
        method: "PUT",
        title: "Admin debug preferences writes",
        slowThresholdMs: 1200,
    },
    "admin/overview:GET": {
        routeName: "admin/overview",
        method: "GET",
        title: "Admin overview snapshot",
        slowThresholdMs: 1800,
    },
    "admin/analytics/realtime:GET": {
        routeName: "admin/analytics/realtime",
        method: "GET",
        title: "Admin realtime analytics snapshot",
        slowThresholdMs: 4000,
    },
    "admin/analytics/historical:GET": {
        routeName: "admin/analytics/historical",
        method: "GET",
        title: "Admin historical analytics snapshot",
        slowThresholdMs: 7000,
    },
    "admin/ui-chart-health:GET": {
        routeName: "admin/ui-chart-health",
        method: "GET",
        title: "Admin UI chart health reads",
        slowThresholdMs: 1200,
    },
    "admin/ui-chart-health:PUT": {
        routeName: "admin/ui-chart-health",
        method: "PUT",
        title: "Admin UI chart health writes",
        slowThresholdMs: 1200,
    },
    "admin/support/threads:GET": {
        routeName: "admin/support/threads",
        method: "GET",
        title: "Admin support queue reads",
        slowThresholdMs: 1200,
    },
    "admin/support/thread:GET": {
        routeName: "admin/support/thread",
        method: "GET",
        title: "Admin support thread reads",
        slowThresholdMs: 1200,
    },
    "admin/support/thread:POST": {
        routeName: "admin/support/thread",
        method: "POST",
        title: "Admin support replies",
        slowThresholdMs: 1500,
    },
    "admin/support/thread:PATCH": {
        routeName: "admin/support/thread",
        method: "PATCH",
        title: "Admin support status updates",
        slowThresholdMs: 1400,
    },
    "admin/moderation/threads:GET": {
        routeName: "admin/moderation/threads",
        method: "GET",
        title: "Admin moderation thread list",
        slowThresholdMs: 1200,
    },
    "admin/moderation/thread:GET": {
        routeName: "admin/moderation/thread",
        method: "GET",
        title: "Admin moderation thread detail",
        slowThresholdMs: 1200,
    },
    "admin/moderation/security-alerts:GET": {
        routeName: "admin/moderation/security-alerts",
        method: "GET",
        title: "Admin moderation security alerts",
        slowThresholdMs: 1200,
    },
    "admin/analytics/preferences:GET": {
        routeName: "admin/analytics/preferences",
        method: "GET",
        title: "Admin analytics preferences reads",
        slowThresholdMs: 1000,
    },
    "admin/analytics/preferences:PUT": {
        routeName: "admin/analytics/preferences",
        method: "PUT",
        title: "Admin analytics preferences writes",
        slowThresholdMs: 1200,
    },
    "admin/ui/preferences:GET": {
        routeName: "admin/ui/preferences",
        method: "GET",
        title: "Admin UI preferences reads",
        slowThresholdMs: 1000,
    },
    "admin/ui/preferences:PUT": {
        routeName: "admin/ui/preferences",
        method: "PUT",
        title: "Admin UI preferences writes",
        slowThresholdMs: 1200,
    },
    "creator/discovery:GET": {
        routeName: "creator/discovery",
        method: "GET",
        title: "Creator discovery reads",
        slowThresholdMs: 900,
    },
    "notifications:GET": {
        routeName: "notifications",
        method: "GET",
        title: "Notification inbox reads",
        slowThresholdMs: 900,
    },
    "notifications:POST": {
        routeName: "notifications",
        method: "POST",
        title: "Notification dispatch writes",
        slowThresholdMs: 1400,
    },
    "notifications:PUT": {
        routeName: "notifications",
        method: "PUT",
        title: "Notification read-state writes",
        slowThresholdMs: 1200,
    },
    "chat/threads:GET": {
        routeName: "chat/threads",
        method: "GET",
        title: "Chat thread list reads",
        slowThresholdMs: 900,
    },
    "chat/thread:GET": {
        routeName: "chat/thread",
        method: "GET",
        title: "Chat thread detail reads",
        slowThresholdMs: 1000,
    },
    "chat/thread:DELETE": {
        routeName: "chat/thread",
        method: "DELETE",
        title: "Chat thread hides",
        slowThresholdMs: 1000,
    },
    "chat/messages:POST": {
        routeName: "chat/messages",
        method: "POST",
        title: "Chat message sends",
        slowThresholdMs: 1600,
    },
    "chat/attachments/prepare:POST": {
        routeName: "chat/attachments/prepare",
        method: "POST",
        title: "Chat attachment prepare",
        slowThresholdMs: 1200,
    },
    "chat/attachments/complete:POST": {
        routeName: "chat/attachments/complete",
        method: "POST",
        title: "Chat attachment finalize",
        slowThresholdMs: 1800,
    },
    "chat/attachments/cancel:POST": {
        routeName: "chat/attachments/cancel",
        method: "POST",
        title: "Chat attachment cleanup",
        slowThresholdMs: 1400,
    },
    "chat/read:POST": {
        routeName: "chat/read",
        method: "POST",
        title: "Chat read-state updates",
        slowThresholdMs: 800,
    },
    "creator/messages:GET": {
        routeName: "creator/messages",
        method: "GET",
        title: "Legacy creator-message reads",
        slowThresholdMs: 1000,
    },
    "creator/messages:POST": {
        routeName: "creator/messages",
        method: "POST",
        title: "Legacy creator-message sends",
        slowThresholdMs: 1600,
    },
    "creator/messages:DELETE": {
        routeName: "creator/messages",
        method: "DELETE",
        title: "Legacy creator-message moderation",
        slowThresholdMs: 1000,
    },
    "creator/relationships:GET": {
        routeName: "creator/relationships",
        method: "GET",
        title: "Creator relationships reads",
        slowThresholdMs: 800,
    },
    "creator/relationships:POST": {
        routeName: "creator/relationships",
        method: "POST",
        title: "Creator relationships writes",
        slowThresholdMs: 1000,
    },
    "user/activity:GET": {
        routeName: "user/activity",
        method: "GET",
        title: "User activity reads",
        slowThresholdMs: 900,
    },
    "checkin:POST": {
        routeName: "checkin",
        method: "POST",
        title: "Daily check-in claims",
        slowThresholdMs: 1400,
    },
    "drops/feed:GET": {
        routeName: "drops/feed",
        method: "GET",
        title: "Drops feed reads",
        slowThresholdMs: 900,
    },
    "drops/content:GET": {
        routeName: "drops/content",
        method: "GET",
        title: "Owned content proxy reads",
        slowThresholdMs: 1800,
    },
    "viewer/watch-session:POST": {
        routeName: "viewer/watch-session",
        method: "POST",
        title: "Viewer watch-session writes",
        slowThresholdMs: 1800,
    },
    "auth/manual-sign-in-lookup:POST": {
        routeName: "auth/manual-sign-in-lookup",
        method: "POST",
        title: "Manual sign-in lookup",
        slowThresholdMs: 1000,
    },
    "user/register:POST": {
        routeName: "user/register",
        method: "POST",
        title: "Manual account registration",
        slowThresholdMs: 1500,
    },
    "user/profile:GET": {
        routeName: "user/profile",
        method: "GET",
        title: "User profile reads",
        slowThresholdMs: 1000,
    },
    "support/threads:GET": {
        routeName: "support/threads",
        method: "GET",
        title: "Support inbox reads",
        slowThresholdMs: 900,
    },
    "support/threads:POST": {
        routeName: "support/threads",
        method: "POST",
        title: "Support ticket creation",
        slowThresholdMs: 1200,
    },
    "admin/ai/drop-covers/generate:POST": {
        routeName: "admin/ai/drop-covers/generate",
        method: "POST",
        title: "AI cover generation",
        slowThresholdMs: 12_000,
    },
    "admin/ai/drop-covers:GET": {
        routeName: "admin/ai/drop-covers",
        method: "GET",
        title: "AI cover admin reads",
        slowThresholdMs: 1400,
    },
    "admin/ai/drop-covers:PUT": {
        routeName: "admin/ai/drop-covers",
        method: "PUT",
        title: "AI cover admin settings writes",
        slowThresholdMs: 1600,
    },
    "admin/ai/drop-covers/template:POST": {
        routeName: "admin/ai/drop-covers/template",
        method: "POST",
        title: "AI cover primary reference uploads",
        slowThresholdMs: 2500,
    },
    "admin/ai/drop-covers/template:DELETE": {
        routeName: "admin/ai/drop-covers/template",
        method: "DELETE",
        title: "AI cover primary reference removals",
        slowThresholdMs: 1800,
    },
    "admin/ai/drop-covers/feedback:POST": {
        routeName: "admin/ai/drop-covers/feedback",
        method: "POST",
        title: "AI cover feedback writes",
        slowThresholdMs: 1400,
    },
    "admin/ai/drop-covers/references:GET": {
        routeName: "admin/ai/drop-covers/references",
        method: "GET",
        title: "AI cover reference library reads",
        slowThresholdMs: 1200,
    },
    "admin/ai/drop-covers/references:POST": {
        routeName: "admin/ai/drop-covers/references",
        method: "POST",
        title: "AI cover reference uploads",
        slowThresholdMs: 2500,
    },
    "admin/ai/drop-covers/references:PUT": {
        routeName: "admin/ai/drop-covers/references",
        method: "PUT",
        title: "AI cover reference updates",
        slowThresholdMs: 1400,
    },
    "admin/ai/drop-covers/references:DELETE": {
        routeName: "admin/ai/drop-covers/references",
        method: "DELETE",
        title: "AI cover reference removals",
        slowThresholdMs: 1600,
    },
    "admin/ai/drop-covers/prompt-policy:GET": {
        routeName: "admin/ai/drop-covers/prompt-policy",
        method: "GET",
        title: "AI cover prompt policy reads",
        slowThresholdMs: 1200,
    },
    "admin/ai/drop-covers/prompt-policy:PUT": {
        routeName: "admin/ai/drop-covers/prompt-policy",
        method: "PUT",
        title: "AI cover prompt policy writes",
        slowThresholdMs: 1600,
    },
    "admin/ai/drop-descriptions:GET": {
        routeName: "admin/ai/drop-descriptions",
        method: "GET",
        title: "AI description admin reads",
        slowThresholdMs: 1400,
    },
    "admin/ai/drop-descriptions:PUT": {
        routeName: "admin/ai/drop-descriptions",
        method: "PUT",
        title: "AI description admin settings writes",
        slowThresholdMs: 1600,
    },
    "admin/ai/drop-descriptions/generate:POST": {
        routeName: "admin/ai/drop-descriptions/generate",
        method: "POST",
        title: "AI description generation",
        slowThresholdMs: 7000,
    },
    "admin/ai/drop-descriptions/feedback:POST": {
        routeName: "admin/ai/drop-descriptions/feedback",
        method: "POST",
        title: "AI description feedback writes",
        slowThresholdMs: 1400,
    },
    "admin/ai/drop-descriptions/prompt-policy:PUT": {
        routeName: "admin/ai/drop-descriptions/prompt-policy",
        method: "PUT",
        title: "AI description prompt policy writes",
        slowThresholdMs: 1600,
    },
    "admin/ai/drop-covers/review-gallery:GET": {
        routeName: "admin/ai/drop-covers/review-gallery",
        method: "GET",
        title: "AI cover review gallery reads",
        slowThresholdMs: 1200,
    },
    "admin/ai/drop-covers/review-gallery:PUT": {
        routeName: "admin/ai/drop-covers/review-gallery",
        method: "PUT",
        title: "AI cover review gallery updates",
        slowThresholdMs: 1400,
    },
    "drops:GET": {
                routeName: "drops",
                method: "GET",
                title: "Auto-generated for drops",
                slowThresholdMs: 1200,
            },
    "admin/analytics:GET": {
                routeName: "admin/analytics",
                method: "GET",
                title: "Auto-generated for admin/analytics",
                slowThresholdMs: 1200,
            },
    "admin/balance:POST": {
                routeName: "admin/balance",
                method: "POST",
                title: "Auto-generated for admin/balance",
                slowThresholdMs: 1200,
            },
    "admin/content:GET": {
                routeName: "admin/content",
                method: "GET",
                title: "Auto-generated for admin/content",
                slowThresholdMs: 1200,
            },
    "admin/content:POST": {
                routeName: "admin/content",
                method: "POST",
                title: "Auto-generated for admin/content",
                slowThresholdMs: 1200,
            },
    "admin/content:DELETE": {
                routeName: "admin/content",
                method: "DELETE",
                title: "Auto-generated for admin/content",
                slowThresholdMs: 1200,
            },
    "admin/creator-options:GET": {
                routeName: "admin/creator-options",
                method: "GET",
                title: "Auto-generated for admin/creator-options",
                slowThresholdMs: 1200,
            },
    "admin/drops:POST": {
                routeName: "admin/drops",
                method: "POST",
                title: "Auto-generated for admin/drops",
                slowThresholdMs: 1200,
            },
    "admin/drops:PUT": {
                routeName: "admin/drops",
                method: "PUT",
                title: "Auto-generated for admin/drops",
                slowThresholdMs: 1200,
            },
    "admin/drops:DELETE": {
                routeName: "admin/drops",
                method: "DELETE",
                title: "Auto-generated for admin/drops",
                slowThresholdMs: 1200,
            },
    "admin/feedback:GET": {
                routeName: "admin/feedback",
                method: "GET",
                title: "Auto-generated for admin/feedback",
                slowThresholdMs: 1200,
            },
    "admin/queue:GET": {
                routeName: "admin/queue",
                method: "GET",
                title: "Auto-generated for admin/queue",
                slowThresholdMs: 1200,
            },
    "admin/queue:PUT": {
                routeName: "admin/queue",
                method: "PUT",
                title: "Auto-generated for admin/queue",
                slowThresholdMs: 1200,
            },
    "admin/roster:GET": {
                routeName: "admin/roster",
                method: "GET",
                title: "Auto-generated for admin/roster",
                slowThresholdMs: 1200,
            },
    "admin/roster:POST": {
                routeName: "admin/roster",
                method: "POST",
                title: "Auto-generated for admin/roster",
                slowThresholdMs: 1200,
            },
    "admin/tasks:GET": {
                routeName: "admin/tasks",
                method: "GET",
                title: "Auto-generated for admin/tasks",
                slowThresholdMs: 1200,
            },
    "admin/tasks:POST": {
                routeName: "admin/tasks",
                method: "POST",
                title: "Auto-generated for admin/tasks",
                slowThresholdMs: 1200,
            },
    "admin/tasks:PUT": {
                routeName: "admin/tasks",
                method: "PUT",
                title: "Auto-generated for admin/tasks",
                slowThresholdMs: 1200,
            },
    "admin/users:GET": {
                routeName: "admin/users",
                method: "GET",
                title: "Auto-generated for admin/users",
                slowThresholdMs: 1200,
            },
    "admin/users:PUT": {
                routeName: "admin/users",
                method: "PUT",
                title: "Auto-generated for admin/users",
                slowThresholdMs: 1200,
            },
    "admin/users:POST": {
                routeName: "admin/users",
                method: "POST",
                title: "Auto-generated for admin/users",
                slowThresholdMs: 1200,
            },
    "analytics/ingest:POST": {
                routeName: "analytics/ingest",
                method: "POST",
                title: "Auto-generated for analytics/ingest",
                slowThresholdMs: 1200,
            },
    "analytics/ingest-identified:POST": {
                routeName: "analytics/ingest-identified",
                method: "POST",
                title: "Auto-generated for analytics/ingest-identified",
                slowThresholdMs: 1200,
            },
    "auth/navigation-session:POST": {
                routeName: "auth/navigation-session",
                method: "POST",
                title: "Auto-generated for auth/navigation-session",
                slowThresholdMs: 1200,
            },
    "auth/navigation-session:DELETE": {
                routeName: "auth/navigation-session",
                method: "DELETE",
                title: "Auto-generated for auth/navigation-session",
                slowThresholdMs: 1200,
            },
    "creator/bookings:GET": {
                routeName: "creator/bookings",
                method: "GET",
                title: "Auto-generated for creator/bookings",
                slowThresholdMs: 1200,
            },
    "creator/bookings:POST": {
                routeName: "creator/bookings",
                method: "POST",
                title: "Auto-generated for creator/bookings",
                slowThresholdMs: 1200,
            },
    "creator/bookings:PUT": {
                routeName: "creator/bookings",
                method: "PUT",
                title: "Auto-generated for creator/bookings",
                slowThresholdMs: 1200,
            },
    "creator/broadcasts:GET": {
                routeName: "creator/broadcasts",
                method: "GET",
                title: "Auto-generated for creator/broadcasts",
                slowThresholdMs: 1200,
            },
    "creator/broadcasts:POST": {
                routeName: "creator/broadcasts",
                method: "POST",
                title: "Auto-generated for creator/broadcasts",
                slowThresholdMs: 1200,
            },
    "creator/broadcasts:DELETE": {
                routeName: "creator/broadcasts",
                method: "DELETE",
                title: "Auto-generated for creator/broadcasts",
                slowThresholdMs: 1200,
            },
    "creator/drops:POST": {
                routeName: "creator/drops",
                method: "POST",
                title: "Auto-generated for creator/drops",
                slowThresholdMs: 1200,
            },
    "creator/drops:PUT": {
                routeName: "creator/drops",
                method: "PUT",
                title: "Auto-generated for creator/drops",
                slowThresholdMs: 1200,
            },
    "creator/payouts:GET": {
                routeName: "creator/payouts",
                method: "GET",
                title: "Auto-generated for creator/payouts",
                slowThresholdMs: 1200,
            },
    "creator/payouts:POST": {
                routeName: "creator/payouts",
                method: "POST",
                title: "Auto-generated for creator/payouts",
                slowThresholdMs: 1200,
            },
    "creator/payouts:PUT": {
                routeName: "creator/payouts",
                method: "PUT",
                title: "Auto-generated for creator/payouts",
                slowThresholdMs: 1200,
            },
    "creator/requests:GET": {
                routeName: "creator/requests",
                method: "GET",
                title: "Auto-generated for creator/requests",
                slowThresholdMs: 1200,
            },
    "creator/requests:POST": {
                routeName: "creator/requests",
                method: "POST",
                title: "Auto-generated for creator/requests",
                slowThresholdMs: 1200,
            },
    "creator/requests:PUT": {
                routeName: "creator/requests",
                method: "PUT",
                title: "Auto-generated for creator/requests",
                slowThresholdMs: 1200,
            },
    "creator/settings:GET": {
                routeName: "creator/settings",
                method: "GET",
                title: "Auto-generated for creator/settings",
                slowThresholdMs: 1200,
            },
    "creator/settings:PUT": {
                routeName: "creator/settings",
                method: "PUT",
                title: "Auto-generated for creator/settings",
                slowThresholdMs: 1200,
            },
    "creator/subscriptions:GET": {
                routeName: "creator/subscriptions",
                method: "GET",
                title: "Auto-generated for creator/subscriptions",
                slowThresholdMs: 1200,
            },
    "creator/subscriptions:POST": {
                routeName: "creator/subscriptions",
                method: "POST",
                title: "Auto-generated for creator/subscriptions",
                slowThresholdMs: 1200,
            },
    "creators/[username]:GET": {
                routeName: "creators/[username]",
                method: "GET",
                title: "Auto-generated for creators/[username]",
                slowThresholdMs: 1200,
            },
    "cron/notify-active-drops:GET": {
                routeName: "cron/notify-active-drops",
                method: "GET",
                title: "Auto-generated for cron/notify-active-drops",
                slowThresholdMs: 1200,
            },
    "cron/process-creator-subscriptions:GET": {
                routeName: "cron/process-creator-subscriptions",
                method: "GET",
                title: "Auto-generated for cron/process-creator-subscriptions",
                slowThresholdMs: 1200,
            },
    "cron/process-queue:GET": {
                routeName: "cron/process-queue",
                method: "GET",
                title: "Auto-generated for cron/process-queue",
                slowThresholdMs: 1200,
            },
    "paypal/capture:POST": {
                routeName: "paypal/capture",
                method: "POST",
                title: "Auto-generated for paypal/capture",
                slowThresholdMs: 1200,
            },
    "paypal/create:POST": {
                routeName: "paypal/create",
                method: "POST",
                title: "Auto-generated for paypal/create",
                slowThresholdMs: 1200,
            },
    "privacy/consent:POST": {
                routeName: "privacy/consent",
                method: "POST",
                title: "Auto-generated for privacy/consent",
                slowThresholdMs: 1200,
            },
    "security/log-attempt:POST": {
                routeName: "security/log-attempt",
                method: "POST",
                title: "Auto-generated for security/log-attempt",
                slowThresholdMs: 1200,
            },
    "settings/landing:GET": {
                routeName: "settings/landing",
                method: "GET",
                title: "Auto-generated for settings/landing",
                slowThresholdMs: 1200,
            },
    "tasks/feedback:POST": {
                routeName: "tasks/feedback",
                method: "POST",
                title: "Auto-generated for tasks/feedback",
                slowThresholdMs: 1200,
            },
    "tasks/rotate:POST": {
                routeName: "tasks/rotate",
                method: "POST",
                title: "Auto-generated for tasks/rotate",
                slowThresholdMs: 1200,
            },
    "user/check-username:GET": {
                routeName: "user/check-username",
                method: "GET",
                title: "Auto-generated for user/check-username",
                slowThresholdMs: 1200,
            },
    "user/complete-onboarding:POST": {
                routeName: "user/complete-onboarding",
                method: "POST",
                title: "Auto-generated for user/complete-onboarding",
                slowThresholdMs: 1200,
            },
    "user/data:GET": {
                routeName: "user/data",
                method: "GET",
                title: "Auto-generated for user/data",
                slowThresholdMs: 1200,
            },
    "user/delete:DELETE": {
                routeName: "user/delete",
                method: "DELETE",
                title: "Auto-generated for user/delete",
                slowThresholdMs: 1200,
            },
    "user/follow:POST": {
                routeName: "user/follow",
                method: "POST",
                title: "Auto-generated for user/follow",
                slowThresholdMs: 1200,
            },
    "user/onboarding-progress:POST": {
                routeName: "user/onboarding-progress",
                method: "POST",
                title: "Auto-generated for user/onboarding-progress",
                slowThresholdMs: 1200,
            },
    "user/profile:PUT": {
                routeName: "user/profile",
                method: "PUT",
                title: "Auto-generated for user/profile",
                slowThresholdMs: 1200,
            },
    "user/profile:POST": {
                routeName: "user/profile",
                method: "POST",
                title: "Auto-generated for user/profile",
                slowThresholdMs: 1200,
            },
    "user/revoke-sessions:POST": {
                routeName: "user/revoke-sessions",
                method: "POST",
                title: "Auto-generated for user/revoke-sessions",
                slowThresholdMs: 1200,
            },
    "wallet/packages:GET": {
                routeName: "wallet/packages",
                method: "GET",
                title: "Auto-generated for wallet/packages",
                slowThresholdMs: 1200,
            },
    "drops/duplicate-filenames:POST": {
                routeName: "drops/duplicate-filenames",
                method: "POST",
                title: "Auto-generated for drops/duplicate-filenames",
                slowThresholdMs: 1200,
            },
    "drops/feedback:POST": {
                routeName: "drops/feedback",
                method: "POST",
                title: "Auto-generated for drops/feedback",
                slowThresholdMs: 1200,
            },
    "drops/impression:POST": {
                routeName: "drops/impression",
                method: "POST",
                title: "Auto-generated for drops/impression",
                slowThresholdMs: 1200,
            },
    "drops/recommendations:GET": {
                routeName: "drops/recommendations",
                method: "GET",
                title: "Auto-generated for drops/recommendations",
                slowThresholdMs: 1200,
            },
    "drops/retention:GET": {
                routeName: "drops/retention",
                method: "GET",
                title: "Auto-generated for drops/retention",
                slowThresholdMs: 1200,
            },
    "drops/track:POST": {
                routeName: "drops/track",
                method: "POST",
                title: "Auto-generated for drops/track",
                slowThresholdMs: 1200,
            },
    "drops/unlock:POST": {
                routeName: "drops/unlock",
                method: "POST",
                title: "Auto-generated for drops/unlock",
                slowThresholdMs: 1200,
            },
    "admin/orchestration/repairs:POST": {
                routeName: "admin/orchestration/repairs",
                method: "POST",
                title: "Auto-generated for admin/orchestration/repairs",
                slowThresholdMs: 1200,
            },
    "admin/user/[userId]:GET": {
                routeName: "admin/user/[userId]",
                method: "GET",
                title: "Auto-generated for admin/user/[userId]",
                slowThresholdMs: 1200,
            },
    "creator/onboarding/application:PUT": {
                routeName: "creator/onboarding/application",
                method: "PUT",
                title: "Auto-generated for creator/onboarding/application",
                slowThresholdMs: 1200,
            },
    "creator/onboarding/contract-signature:POST": {
                routeName: "creator/onboarding/contract-signature",
                method: "POST",
                title: "Auto-generated for creator/onboarding/contract-signature",
                slowThresholdMs: 1200,
            },
    "creator/onboarding/id-submission:POST": {
                routeName: "creator/onboarding/id-submission",
                method: "POST",
                title: "Auto-generated for creator/onboarding/id-submission",
                slowThresholdMs: 1200,
            },
    "creator/onboarding/intro:POST": {
                routeName: "creator/onboarding/intro",
                method: "POST",
                title: "Auto-generated for creator/onboarding/intro",
                slowThresholdMs: 1200,
            },
    "tasks/reminders/sync:POST": {
                routeName: "tasks/reminders/sync",
                method: "POST",
                title: "Auto-generated for tasks/reminders/sync",
                slowThresholdMs: 1200,
            },
    "admin/queue/toggle:POST": {
                routeName: "admin/queue/toggle",
                method: "POST",
                title: "Auto-generated for admin/queue/toggle",
                slowThresholdMs: 1200,
            },
    "admin/users/realtime:GET": {
                routeName: "admin/users/realtime",
                method: "GET",
                title: "Auto-generated for admin/users/realtime",
                slowThresholdMs: 1200,
            },
    "chat/threads/[threadId]:GET": {
                routeName: "chat/threads/[threadId]",
                method: "GET",
                title: "Auto-generated for chat/threads/[threadId]",
                slowThresholdMs: 1200,
            },
    "chat/threads/[threadId]:DELETE": {
                routeName: "chat/threads/[threadId]",
                method: "DELETE",
                title: "Auto-generated for chat/threads/[threadId]",
                slowThresholdMs: 1200,
            },
    "settings/landing/upload:POST": {
                routeName: "settings/landing/upload",
                method: "POST",
                title: "Auto-generated for settings/landing/upload",
                slowThresholdMs: 1200,
            },
    "support/threads/[threadId]:GET": {
                routeName: "support/threads/[threadId]",
                method: "GET",
                title: "Auto-generated for support/threads/[threadId]",
                slowThresholdMs: 1200,
            },
    "support/threads/[threadId]:POST": {
                routeName: "support/threads/[threadId]",
                method: "POST",
                title: "Auto-generated for support/threads/[threadId]",
                slowThresholdMs: 1200,
            },
    "support/threads/[threadId]:PATCH": {
                routeName: "support/threads/[threadId]",
                method: "PATCH",
                title: "Auto-generated for support/threads/[threadId]",
                slowThresholdMs: 1200,
            },
    "support/threads/guest:POST": {
                routeName: "support/threads/guest",
                method: "POST",
                title: "Auto-generated for support/threads/guest",
                slowThresholdMs: 1200,
            },
    "drops/[dropId]/click:POST": {
                routeName: "drops/[dropId]/click",
                method: "POST",
                title: "Auto-generated for drops/[dropId]/click",
                slowThresholdMs: 1200,
            },
    "admin/moderation/threads/[threadId]:GET": {
                routeName: "admin/moderation/threads/[threadId]",
                method: "GET",
                title: "Auto-generated for admin/moderation/threads/[threadId]",
                slowThresholdMs: 1200,
            },
    "admin/support/threads/[threadId]:GET": {
                routeName: "admin/support/threads/[threadId]",
                method: "GET",
                title: "Auto-generated for admin/support/threads/[threadId]",
                slowThresholdMs: 1200,
            },
    "admin/support/threads/[threadId]:POST": {
                routeName: "admin/support/threads/[threadId]",
                method: "POST",
                title: "Auto-generated for admin/support/threads/[threadId]",
                slowThresholdMs: 1200,
            },
    "admin/support/threads/[threadId]:PATCH": {
                routeName: "admin/support/threads/[threadId]",
                method: "PATCH",
                title: "Auto-generated for admin/support/threads/[threadId]",
                slowThresholdMs: 1200,
            },
    "admin/users/[userId]/username:PATCH": {
                routeName: "admin/users/[userId]/username",
                method: "PATCH",
                title: "Auto-generated for admin/users/[userId]/username",
                slowThresholdMs: 1200,
            },
    "chat/threads/[threadId]/messages:POST": {
                routeName: "chat/threads/[threadId]/messages",
                method: "POST",
                title: "Auto-generated for chat/threads/[threadId]/messages",
                slowThresholdMs: 1200,
            },
    "chat/threads/[threadId]/read:POST": {
                routeName: "chat/threads/[threadId]/read",
                method: "POST",
                title: "Auto-generated for chat/threads/[threadId]/read",
                slowThresholdMs: 1200,
            },
    "admin/user/[userId]/creator-onboarding/id-document:GET": {
                routeName: "admin/user/[userId]/creator-onboarding/id-document",
                method: "GET",
                title: "Auto-generated for admin/user/[userId]/creator-onboarding/id-document",
                slowThresholdMs: 1200,
            }
} as const;

export const ROUTE_RUNTIME_HEALTH_STALE_AFTER_MS = 1000 * 60 * 60 * 24;
export const ROUTE_RUNTIME_HEALTH_FAIL_ACTIVE_WINDOW_MS = 1000 * 60 * 60 * 4;

export type RouteRuntimeHealthKey = keyof typeof ROUTE_RUNTIME_HEALTH_TARGETS;
export type RouteRuntimeHealthMethod = typeof ROUTE_RUNTIME_HEALTH_TARGETS[RouteRuntimeHealthKey]["method"];
export type RouteRuntimeHealthLastResult = "success" | "client_error" | "server_error";
export type RouteRuntimeHealthStatus = "healthy" | "warn" | "fail" | "stale";
export type RouteRuntimeHealthCoverageState = "observed" | "unseen";
export type RouteRuntimeHealthFreshness = "fresh" | "stale" | "unseen";
export type RouteRuntimeHealthCluster = "native_chat" | "compatibility_chat" | "other";

export type RouteRuntimeHealthItem = {
    key: RouteRuntimeHealthKey;
    routeName: string;
    method: RouteRuntimeHealthMethod;
    title: string;
    slowThresholdMs: number;
    successCount: number;
    clientErrorCount: number;
    serverErrorCount: number;
    slowCount: number;
    averageLatencyMs: number;
    maxLatencyMs: number;
    lastLatencyMs: number;
    lastResult: RouteRuntimeHealthLastResult;
    lastStatusCode: number;
    lastErrorMessage: string | null;
    firstObservedAtMs: number;
    updatedAtMs: number;
    lastSuccessAtMs: number;
    lastClientErrorAtMs: number;
    lastServerErrorAtMs: number;
};

function toNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function getRouteRuntimeHealthCoverageState(item: Pick<RouteRuntimeHealthItem, "updatedAtMs">): RouteRuntimeHealthCoverageState {
    return toNumber(item.updatedAtMs) > 0 ? "observed" : "unseen";
}

export function getRouteRuntimeHealthFreshness(
    item: Pick<RouteRuntimeHealthItem, "updatedAtMs">,
    nowMs = Date.now(),
): RouteRuntimeHealthFreshness {
    if (getRouteRuntimeHealthCoverageState(item) === "unseen") {
        return "unseen";
    }

    return Math.max(0, nowMs - toNumber(item.updatedAtMs)) >= ROUTE_RUNTIME_HEALTH_STALE_AFTER_MS
        ? "stale"
        : "fresh";
}

export function getRouteRuntimeHealthCluster(key: RouteRuntimeHealthKey | string): RouteRuntimeHealthCluster {
    if (key.startsWith("chat/")) {
        return "native_chat";
    }

    if (key.startsWith("creator/messages:")) {
        return "compatibility_chat";
    }

    return "other";
}

export function getRouteRuntimeHealthStatus(
    item: Pick<RouteRuntimeHealthItem, "updatedAtMs" | "lastResult" | "clientErrorCount" | "serverErrorCount" | "slowCount" | "lastServerErrorAtMs">,
    nowMs = Date.now(),
): RouteRuntimeHealthStatus {
    const freshness = getRouteRuntimeHealthFreshness(item, nowMs);
    if (freshness === "unseen") {
        return "warn";
    }

    if (freshness === "stale") {
        return "stale";
    }

    if (
        item.lastResult === "server_error"
        && Math.max(0, nowMs - toNumber(item.lastServerErrorAtMs || item.updatedAtMs)) <= ROUTE_RUNTIME_HEALTH_FAIL_ACTIVE_WINDOW_MS
    ) {
        return "fail";
    }

    if (item.clientErrorCount > 0 || item.serverErrorCount > 0 || item.slowCount > 0) {
        return "warn";
    }

    return "healthy";
}

export function summarizeRouteRuntimeHealth(items: readonly RouteRuntimeHealthItem[], nowMs = Date.now()) {
    return {
        total: items.length,
        healthy: items.filter((item) => getRouteRuntimeHealthStatus(item, nowMs) === "healthy").length,
        warn: items.filter((item) => getRouteRuntimeHealthStatus(item, nowMs) === "warn").length,
        fail: items.filter((item) => getRouteRuntimeHealthStatus(item, nowMs) === "fail").length,
        stale: items.filter((item) => getRouteRuntimeHealthStatus(item, nowMs) === "stale").length,
        unobserved: items.filter((item) => getRouteRuntimeHealthCoverageState(item) === "unseen").length,
        slow: items.reduce((sum, item) => sum + toNumber(item.slowCount), 0),
        serverErrors: items.reduce((sum, item) => sum + toNumber(item.serverErrorCount), 0),
        clientErrors: items.reduce((sum, item) => sum + toNumber(item.clientErrorCount), 0),
    };
}
