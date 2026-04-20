# Copy Vocabulary & Tone Contract

This contract dictates the vocabulary, tone, length, and A/B safety rules for all user-facing and admin-facing copy inside the KandyDrops repo.

## 1. Tone Families & Strict Separation
- **Fan Surfaces (User-Facing)**: Tone must be hype, engaging, playful, but fiercely clear about economics (wallet, unlocks, drops). **No administrative jargon.**
- **Creator/Admin Surfaces (Operational)**: Tone must be sterile, declarative, and brutally honest. **No user fluff, fake metrics, or gamification.** If a metric is failing, it must explicitly state "FAILED" or "STALE", never "LOADING..." infinitely or "OPTIMAL" when unverified.

## 2. Approved Vocabulary
- GumDrops (not coins, tokens, points)
- Drop (not post, release, asset)
- Unlock (not purchase, buy, acquire)
- Wallet (not account balance, funds)
- Experience
- Creator 
- Fan

## 3. Banned Rhetoric & Phrases
- "Oops, something went wrong!" -> Use declarative failure: "Network timeout during Wallet Sync."
- "It looks like..." -> No guessing. State what is known: "Missing canonical tracking token."
- "Loading..." for longer than 2 seconds without fallback -> Provide actual state: "Fetching realtime snapshot..." or "Resyncing stale cache..."
- "Fake", "Simulated" -> Do not let simulated states leak into Admin truth.
- "Points", "Credits", "Tokens" -> Never use these in place of GumDrops.

## 4. Length Limits
- **Page Titles (H1)**: Max 30 characters.
- **Section Headers (H2/H3)**: Max 40 characters.
- **Helper Text / Subtitles**: Max 120 characters / 2 short sentences.
- **No Duplicate Semantics**: Do not repeat the title in the helper text. (e.g. Title: "Wallet Balance". Helper: "View your wallet balance." -> **BANNED**).

## 5. A/B Testing Copy Safety
**Safe for Future A/B Variation:**
- Hero wording, CTA emphasis (button lengths), spotlight placement, non-critical copy, and onboarding hooks.

**Strictly Unsafe for A/B Testing (DO NOT TOUCH):**
- Auth/Session core states, Unlock verification semantics, tracking payload identifiers, PayPal webhooks, GumDrops ledgers. Copy dealing with financial truth must be 100% legally static.

