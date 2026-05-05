# Security And Cost Doctrine

Authority level: 4

Owner: speed/security/cost

## Must

- Classify every API route by auth, trusted origin, rate limit, idempotency, cost risk, cache mode, and expected failures.
- Keep user/payment/support/chat/security routes no-store where required.
- Keep public/stable data cached intentionally.
- Use App Check, origin checks, and rate limits according to route contract.

## Must Not

- Run broad browser audits as a first-line security check.
- Add unbounded Firestore, Storage, AI, or Google API cost paths.
- Hide route failures behind silent catch blocks.

## Source Truth

- API cost contract, route cache contract, security hardening contract, Firebase rules.

## Validators

- `check:speed-security`
- `score:speed-security`
- `check:hardening`
- `check:google-cost`
