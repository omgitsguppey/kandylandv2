# Feature Registration Gate

Status: pass

New feature work must register routes, UI surfaces, telemetry events, consent requirements, identity requirements, materializer lanes, score impact, and debug owner before it is treated as complete. This reuses the existing telemetry catalog and behavior extensibility layer instead of creating a duplicate tracker.

## Coverage

- Registered features: 21
- App routes scanned: 174
- Mapped routes: 163
- System/internal routes: 11
- Unmapped routes: 0
- Telemetry events: 481
- Unmapped telemetry events: 0
- UI metrics: 14
- Orphan metrics: 0

## Registered Features

- wallet: owner=wallet-analytics; routes=3; events=9; materializers=1; score=runtimeHealth,evidenceCompleteness,costRisk
- user_dashboard: owner=user-dashboard-analytics; routes=12; events=92; materializers=3; score=sourceHealth,evidenceCompleteness
- drops: owner=drops-analytics; routes=3; events=88; materializers=2; score=sourceHealth,runtimeHealth,evidenceCompleteness
- library: owner=library-analytics; routes=1; events=7; materializers=1; score=evidenceCompleteness
- creator_dashboard: owner=creator-dashboard-analytics; routes=4; events=29; materializers=4; score=sourceHealth,evidenceCompleteness
- creator_settings: owner=creator-settings-analytics; routes=3; events=11; materializers=1; score=sourceHealth,evidenceCompleteness
- creator_drop_manager: owner=creator-drop-manager-analytics; routes=3; events=4; materializers=1; score=sourceHealth,evidenceCompleteness
- creator_profile: owner=creator-profile-analytics; routes=5; events=6; materializers=1; score=sourceHealth,evidenceCompleteness
- broadcasts: owner=broadcasts-analytics; routes=2; events=6; materializers=1; score=sourceHealth,evidenceCompleteness
- fan_pass: owner=fan-pass-analytics; routes=5; events=8; materializers=1; score=runtimeHealth,evidenceCompleteness
- admin_debug: owner=admin-debug-analytics; routes=3; events=89; materializers=1; score=sourceHealth,runtimeHealth,evidenceCompleteness,freshness
- analytics_telemetry: owner=analytics-platform; routes=3; events=174; materializers=5; score=sourceHealth,runtimeHealth,evidenceCompleteness,freshness
- cookie_consent_privacy: owner=privacy-analytics; routes=4; events=102; materializers=2; score=sourceHealth,evidenceCompleteness,regressionRisk
- behavior_tracking: owner=behavioral-intelligence; routes=4; events=140; materializers=4; score=sourceHealth,runtimeHealth,evidenceCompleteness
- runtime_smoke_substitutes: owner=runtime-evidence; routes=7; events=116; materializers=3; score=runtimeHealth,evidenceCompleteness,regressionRisk
- daily_checkin: owner=retention-analytics; routes=3; events=34; materializers=1; score=evidenceCompleteness
- notifications: owner=notifications-analytics; routes=1; events=45; materializers=1; score=runtimeHealth,evidenceCompleteness
- auth_identity: owner=identity-analytics; routes=7; events=51; materializers=1; score=runtimeHealth,evidenceCompleteness
- support: owner=support-analytics; routes=6; events=45; materializers=1; score=runtimeHealth,evidenceCompleteness
- security: owner=security-analytics; routes=2; events=19; materializers=1; score=regressionRisk,runtimeHealth
- search_discovery: owner=search-discovery-analytics; routes=2; events=13; materializers=1; score=evidenceCompleteness

## System/Internal Routes

- src/app/(legal)/terms/page.tsx
- src/app/api/chat/attachments/cancel/route.ts
- src/app/api/chat/attachments/complete/route.ts
- src/app/api/chat/attachments/prepare/route.ts
- src/app/api/chat/threads/[threadId]/messages/route.ts
- src/app/api/chat/threads/[threadId]/read/route.ts
- src/app/api/chat/threads/[threadId]/route.ts
- src/app/api/chat/threads/route.ts
- src/app/api/creator/messages/route.ts
- src/app/dashboard/chat/page.tsx
- src/app/page.tsx

## Failures

- None.
