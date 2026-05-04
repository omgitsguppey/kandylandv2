# KandyDrops

Welcome to the KandyDrops repository.

## ðŸ›‘ STRICT REPOSITORY GOVERNANCE: THE DOCTRINE ðŸ›‘

**For all human and AI (Antigravity) contributors:**
KandyDrops operates under a strict, centralized set of design, copy, and product principles. We do not freestyle. We do not use generic, robotic SaaS language. We do not create fake interactive states.

Before making **ANY** changes to user-facing UI, copy, or product logic, you are **REQUIRED** to consult the KandyDrops Doctrine:

ðŸ‘‰ **[Read the Full Doctrine Here](./docs/doctrine/kandydrops-product-doctrine.md)** ðŸ‘ˆ

### The Core Files You Must Know:
* `/docs/doctrine/kandydrops-product-doctrine.md`: High-level product aesthetic and conversion principles.
* `/docs/doctrine/kandydrops-copy-doctrine.md`: Strict tone and rhetoric rules by surface.
* `/docs/doctrine/kandydrops-ui-doctrine.md`: Interaction and state truth requirements.
* `/docs/doctrine/kandydrops-vocabulary-index.md`: Approved vs. forbidden terminology.
* `/docs/doctrine/kandydrops-decision-checklist.md`: The mandatory checklist before submitting any UI/copy PRs.

**AI Agents:** You are explicitly bound by `/.agent/workflows/ui-copy-refinement-workflow.md` and `/.agent/skills/doctrine-consultation.md`. Ensure you read them before touching code.

### Agent Control Tower
**Before touching UI, copy, telemetry, state, admin truth, or Firebase architecture, start with [/control-tower/00-START-HERE.md](./control-tower/00-START-HERE.md).**

### Open Bot PR Triage
Open bot PRs must be cherry-picked by current-source relevance. Duplicate Bolt/Jules branches should not be merged wholesale. Public beta fixes prioritize current source-of-truth, no UI regression, and targeted validation over broad stale branch merges.

### Device Layout Contract
Google owns structural language: breakpoints, adaptive layout, PWA display mode, viewport units. Apple owns style/cohesion: safe areas, floating tab bars, sidebars on larger screens, glass hierarchy, stable top-level navigation. KandyDrops agents must use `src/lib/device-layout-contract.ts`, `src/lib/user-mobile-shell.ts`, and `npm run check:device-layout-contract`, not freestyle layout physics.

### Device Layout Score
KandyDrops layout scoring is deterministic. It detects violations of Google-style structure and Apple-style cohesion using hardcoded file/path/pattern rules. It can auto-fix exact safe token/string replacements only. It must escalate anything involving payments, auth, locked content exposure, keyboard runtime behavior, visual judgment, or product intent.

### Hydration Performance
KandyDrops hydration uses staged priority lanes. Critical shell and first actions hydrate first. Telemetry/session/privacy truth remains connected. Diagnostics, overlays, bridges, cookie UI, bug reports, onboarding helpers, notification runtime, and PWA enhancement load after paint or idle unless required by the current interaction. No public-beta performance fix may disconnect tracking, privacy consent, parity truth, or source-of-truth debug surfaces.

### Ast-Grep Source Rules
KandyDrops ast-grep rules are deterministic source guardrails. They catch forbidden shell, safe-area, preview content-protection, diagnostics, timer, and breakpoint patterns from source files without replacing targeted tests or broad runtime validation. Use `npm run check:ast-grep-rules` before broad browser audits.

### Component Test Doctrine
KandyDrops component tests verify behavior and state truth, not screenshots. Fast UI tests should use shared auth/profile/drop states, exercise real component affordances where practical, and preserve telemetry/source-of-truth contracts without changing product behavior.

### MSW Test Scenarios
KandyDrops MSW scenarios are deterministic API fixtures, not production fallback state. They model wallet, Drops, chat, notifications, support, and creator profile user-side states without Firebase, browser automation, or live network access.

### GumDrop Source-Of-Funds
Paid package bonus GumDrops are paid-source GumDrops. They count toward `gumDropsPurchasedBalance` and can be used for paid-only creator monetization surfaces. Reward-source GumDrops are only non-purchase rewards such as check-ins, tasks, referrals, onboarding, or admin reward adjustments. Wallet UI may display total delivered package value, but backend source-of-funds truth must preserve paid vs reward source correctly.

### Creator Booking Error Truth
Creator booking expected failures must never surface as generic internal server errors. Availability, slot conflicts, paid-GD shortfalls, disabled bookings, and creator availability must return typed safe error codes with human-readable client copy. Only unexpected route failures should become internal server errors.

### Fan Pass GumDrops Truth
Fan Pass is a paid-source GumDrops subscription. Daily/task/reward GumDrops cannot start or renew Fan Pass. Paid package bonus GumDrops count as paid-source only if credited to purchased balance by wallet capture truth. Expected Fan Pass failures must return typed safe errors, never generic internal server errors.

### Wallet Modal Density
The wallet modal uses compact public-beta density. Package cards show total delivered GumDrops, package label, price, and purple bonus chip only. The visible paid/bonus explanatory subcopy is removed to reduce vertical sprawl. The balance chip shows source-aware free GD and paid GD. Backend source-of-funds accounting and telemetry remain unchanged.

### Public Beta Score
KandyDrops public beta scoring is deterministic and mathematical. It exists to reduce terminal audit sprawl. Agents must use score:beta/check:beta-score and targeted tests first. Heavy browser audits are forbidden by default unless a finding explicitly escalates to runtime visual verification.

### Debug Evidence Pipeline
KandyDrops debug evidence is structured, fingerprinted, stored, and injected into deterministic audits. Runtime issues already detected by the app must become pre-catcher issue candidates before relying on manual bug reports. Support uses one unified inbox model, with admin routes able to list/read/reply to all support threads and users scoped only to their own threads. Debug evidence writes must never block user flows.

### Google Cost Bleed Score
Google cost-bearing surfaces must be declared before use. Firestore, Storage, Google Analytics Data API, Vertex AI, Cloud Run/App Hosting, and any SQL/Data Connect runtime must have route-level cost contracts, budget guards, bounded rate limits, cache policies, and debug evidence. The app must fail audits before it surprises billing.

Firebase Data Connect is present as `sql_dataconnect_agent_context_mirror`: `dataconnect/dataconnect.yaml` targets Cloud SQL instance `kandydrops-db` and PostgreSQL database `kandydrops_db` in `us-central1`. This allowed-but-cost-bearing SQL surface is for agent/repo intelligence mirror infrastructure only. It is forbidden for user, payment, Drop, chat, support, or creator runtime flows unless an explicit SQL/Data Connect `ApiCostContract` approves that route, and `agent:sync-sql` must not run automatically during user-facing builds or deploys.

### Cloud Run SQL BigQuery Guardrails
KandyDrops uses Firebase Data Connect with Cloud SQL only as an agent-context mirror unless explicitly promoted. Cloud Run max instances and concurrency must protect Cloud SQL and AI surfaces. BigQuery exports/imports must be validated, documented, and blocked from mutating runtime balances/transactions unless an explicit dry-run/idempotent import contract exists. Use `npm run score:cloud-cost` and `npm run check:cloud-cost`; do not execute `gcloud`, deploy Data Connect, deploy Firebase, or run BigQuery jobs from this source-only lane.

### Mobile Guest Home Hero Shell
The guest home hero is shell-centered on mobile. It must center within available visual height between fixed top nav and mobile bottom nav/browser/PWA chrome using shell-aware viewport math, not a fixed vh-plus-nav estimate.

### Mobile Chat Shell
The chat route bypasses normal page bottom-nav reservation and owns its own mobile shell spacing. Inbox controls, floating compose controls, and thread composer must sit above the mobile bottom nav in Safari browser and standalone PWA modes using shared chat shell tokens, not per-screen hardcoded offsets.

The chat route bypasses normal page bottom reservation and owns its own stable mobile viewport shell. Chat list and thread views must remain anchored below the navbar across browser, standalone PWA, keyboard focus, and blur. Composer height must be compact and bottom-nav-safe. Diagnostics must not block tap/focus paths.

### Experiences DailyCheckIn Variant
DailyCheckIn has two allowed presentation variants. Dashboard uses the full account-status version with welcome header and subtitle. Experiences uses the compact retention-hub version that hides the welcome header/subtitle and tightens vertical rhythm. Logic, reward ladder, check-in state, confetti, and telemetry remain shared.

### Drop Cover Visibility
Drop cover blur is product-state driven, not loading-state driven. Guests may see protected/blurred covers. Authenticated users and admins see clear covers when they have enough total GumDrops for a normal drop. Authenticated users only see affordability blur when they need a refill for that specific drop. Featured carousel chips use adaptive glass styling and the timer pill does not include a progress bar.

### Featured Drop Polish
Featured drop CTAs and chips are cover-aware through deterministic metadata-based accent mapping, not runtime pixel sampling. Featured social proof shows unwraps only after total unwraps exceed 10; otherwise it shows views. Drop grid view counts remain unchanged. All truncated drop/card titles use the shared TitleMarquee animation, sped up by 50%, with reduced-motion respected. Video file chips use a 🎥 camera indicator for clarity.

### Locked Drop Preview
Locked Drop preview is a dedicated full-page conversion surface, not a bottom sheet. It keeps the global app shell and bottom nav visible, uses safe preview fields only, never exposes internal content thumbnails before unlock, adapts urgency by timer state, collects lightweight feedback, and after successful unwrap hands users to My KandyDrops with the new Drop targeted while also offering Keep Unwrapping.
