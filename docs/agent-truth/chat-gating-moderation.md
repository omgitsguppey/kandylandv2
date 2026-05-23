# Chat Gating Moderation

Generated: 2026-05-23T22:29:04.060Z

## Enforcement

- Text price: 1 paid GD
- Image price: 5 paid GD
- Video price: 10 paid GD
- Paid GD only: true
- Reward/free GD accepted for paid chat: false
- Fan Pass/subscriber bypass: true
- Creator reply bypass: true
- Client price trusted: false
- Client balance trusted: false

## Debug Lane

- Lane: Chat gating/moderation
- Backend enforcement: true
- Blocked attempts: 0
- Insufficient paid GD attempts: 0
- Moderation blocks: 0
- Media limit blocks: 0
- Source-of-funds truth: purchased_only_enforced

## Telemetry

- chat_gating_checked: Chat gating/moderation, support_materializer
- chat_send_blocked: Chat gating/moderation, support_materializer
- chat_insufficient_paid_gd_viewed: Chat gating/moderation, support_materializer
- chat_purchase_cta_clicked: Chat gating/moderation, support_materializer
- chat_media_upload_blocked: Chat gating/moderation, support_materializer
- chat_moderation_blocked: Chat gating/moderation, support_materializer
- chat_fan_pass_bypass_applied: Chat gating/moderation, support_materializer
- chat_creator_reply_bypass_applied: Chat gating/moderation, support_materializer

## Score Impact

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 91.7 | 91.7 | target_met | No score action needed for this dimension. |
| runtimeHealth | 67.25 | 67.25 | below_target | Attach formal runtime/admin/cost evidence through existing score lanes; do not change GumDrop math or payment runtime. |
| evidenceCompleteness | 38.75 | 38.75 | below_target | Attach formal runtime/admin/cost evidence through existing score lanes; do not change GumDrop math or payment runtime. |
| freshness | 62.86 | 62.86 | below_target | Attach formal runtime/admin/cost evidence through existing score lanes; do not change GumDrop math or payment runtime. |
| costRisk | 42 | 42 | below_target | Attach formal runtime/admin/cost evidence through existing score lanes; do not change GumDrop math or payment runtime. |
| regressionRisk | 42 | 42 | below_target | Attach formal runtime/admin/cost evidence through existing score lanes; do not change GumDrop math or payment runtime. |

## Old Logic Classification

- ChatExperience paid-GD guidance card: still_required - UI guidance remains user-facing only; backend spend is still authoritative.
- Server chat purchased-only spend: still_required - Chat send route enforces creator message spend through purchased-only creator experience policy.
- Legacy reward/free GD fallback for paid chat: removed - Paid chat validation rejects reward/free balance for creator message spend.
- Client-computed chat price/balance: removed - Send route accepts message fields only; server computes price and reads balance from canonical user records.
