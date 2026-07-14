# Creator Experiences Copy

Status: Launch refinement doctrine
Last updated: 2026-07-14

## Surface Job

`CreatorExperiencesPanel` is the fan-facing access chooser on creator profiles. It must feel premium, intimate, and simple. It must not explain creator settings internals or make pricing feel hidden.

## Approved Fan-Facing Lane Copy

- Fan Pass: "Stay closer when new access opens."
- Fan Pass benefits:
  - "Priority access to creator moments"
  - "Subscriber chat perks when enabled"
  - "Preferred booking offers when available"
- Private chat: "Send a private message without getting lost in comments."
- Empty chat state: "No private thread yet. Follow [creator] and start with a simple message."
- Custom Request: "Ask for something specific, then let the creator decide what fits."
- Request placeholder: "Describe what you want, the vibe, and any details the creator should know."
- Live Time: "Reserve real time before the window closes."
- Generated availability label: "Available slots"
- No-slot CTA state: "Choose a slot first"

CTA labels:
- "Start Fan Pass"
- "Open private chat"
- "Send custom request"
- "Book live time"

When paid GumDrops are insufficient, `CreatorPaidGdGuidanceCard` owns the shared recovery action:

- "Open Wallet"
- Dynamic deficit context: "Add [amount] GD"

## Mobile Density

The selector grid stays compact and touch-safe. Selected panels use reduced padding on mobile, avoid stacked nested cards, and move secondary explanation into compact rows or `details` sections. Buttons remain at least 44px tall.

Allowed visible colors are black, zinc, white, and brand purple. Do not add cyan, pink, orange, green, red, or one-off status colors to this panel.

## Telemetry

Fan lane telemetry is client-side and cataloged:

- `creator_experience_lane_opened`
- `creator_experience_lane_closed`
- `creator_experience_cta_clicked`
- `creator_experience_insufficient_balance`
- `creator_experience_request_category_selected`
- `creator_experience_booking_type_selected`

Payloads include `actorType`, `actorUid` when available, `anonymousVisitorId`, `sessionId`, `creatorId`, `lane`, `priceGd`, `balanceState`, `route`, and `source: creator_experiences_panel`.

Debug metadata stays non-visual through data attributes and telemetry fields: `laneOpenedCount`, `ctaClicked`, `insufficientBalanceTriggered`, `selectedLane`, `settingsSource`, and `restrictionsSource`.

## Guardrails

Do not change GumDrops pricing, booking rates, subscription rates, request category pricing, billing behavior, wallet routing, or creator settings normalization in a copy/density pass. The source shape remains `CreatorSettings` from `src/lib/creator-experiences.ts`. Booking-time copy must follow generated `creator_availability_windows` slots; do not restore an arbitrary datetime picker. Insufficient-balance recovery copy stays owned by `CreatorPaidGdGuidanceCard`, not a panel-local CTA.
