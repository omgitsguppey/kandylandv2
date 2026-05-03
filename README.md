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

### Mobile Guest Home Hero Shell
The guest home hero is shell-centered on mobile. It must center within available visual height between fixed top nav and mobile bottom nav/browser/PWA chrome using shell-aware viewport math, not a fixed vh-plus-nav estimate.

### Mobile Chat Shell
The chat route bypasses normal page bottom-nav reservation and owns its own mobile shell spacing. Inbox controls, floating compose controls, and thread composer must sit above the mobile bottom nav in Safari browser and standalone PWA modes using shared chat shell tokens, not per-screen hardcoded offsets.

### Experiences DailyCheckIn Variant
DailyCheckIn has two allowed presentation variants. Dashboard uses the full account-status version with welcome header and subtitle. Experiences uses the compact retention-hub version that hides the welcome header/subtitle and tightens vertical rhythm. Logic, reward ladder, check-in state, confetti, and telemetry remain shared.

### Drop Cover Visibility
Drop cover blur is product-state driven, not loading-state driven. Guests may see protected/blurred covers. Authenticated users and admins see clear covers when they have enough total GumDrops for a normal drop. Authenticated users only see affordability blur when they need a refill for that specific drop. Featured carousel chips use adaptive glass styling and the timer pill does not include a progress bar.
