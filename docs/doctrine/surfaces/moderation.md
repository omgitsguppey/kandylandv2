# Moderation Doctrine

Authority level: 4

Owner: moderation/security evidence

## Must

- Treat screenshot-like browser/PWA events as weak heuristic context unless confirmed by platform/server evidence.
- Use evidence-weighted theft-risk and scrape-risk scoring.
- Keep raw asset URLs out of casual admin preview paths.
- Demote risky recommendation candidates with explicit integrity diagnostics unless policy requires removal.

## Must Not

- Claim screenshot detection is confirmed from blur, visibility, or page-leave events alone.
- Restrict users based only on weak visual heuristics.
- Hide integrity demotions from admin diagnostics.

## Source Truth

- Moderation evidence contract, scrape-risk score, content-protection server evidence, integrity risk map.

## Validators

- `check:admin-moderation-real-risk`
- `check:theft-risk-score`
- `check:integrity-demotions`
