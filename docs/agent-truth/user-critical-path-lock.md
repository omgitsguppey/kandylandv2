# User Critical Path Lock

Reviewed: 2026-10-03. Owner: `scripts/agent/validate-user-critical-path-lock.ts`.
Machine-readable source result: `agent/state/user-critical-path-lock.generated.json`.

## Evidence boundary

The lock checks the current user-journey source integration across Home, account entry, Dashboard, check-in, Drops, safe Preview, Wallet, unwrap, Viewer, Chat and Support. Its result is source evidence for the checked input tree. It does not establish payment settlement, provider state, signed-in runtime acceptance, device behavior or public-promo readiness.

The former 2026-05-08 record declared Pass and promo readiness. That statement is historical; version history preserves it. Current status, blockers and warnings come from the input-bound command result, not a standing Pass in this document. A changed dependency invalidates the affected source proof.

## Connected owners

| Contract | Current source binding |
| --- | --- |
| Home account entry | Home renders `PublicHomeExperience` and its `PublicHomeActions`; signup stays on the primary action and the signed-in action links to Dashboard. `HomeClient` uses the canonical profile- and UID-bound preferred route after account readiness, preserving Admin browsing and Creator application routing. |
| Dashboard and check-in | Existing collection, discovery, activity and DailyCheckIn modules remain connected. Reward GD, claim/reset behavior and onboarding targets retain their distinct controls. |
| Wallet balances | `PurchaseModal` consumes `KandyWalletModalFrame` and `KandyWalletHeader`. Formatted reward and paid labels read their matching fields from the canonical profile balance split. Capture, balance math and source-of-funds authority remain in their existing owners. |
| Safe Preview and unwrap | Safe DTO fields, refill/signup/collection actions and bug reporting remain connected. Confirmed transaction and entitlement IDs come from the strict successful server response rather than a client-generated entitlement string. |
| Viewer access | Canonical access truth supplies authorization. Signed-out, missing, failed and unauthorized branches return human recovery states before the authorized content frame; secure content retrieval remains no-store. |
| Chat | The consumed new-message picker reads followed creators and calls the canonical composer. Empty discovery guidance, paid GD semantics and send/read failure copy remain required. |
| Support | `SupportInbox` forwards its composer state and create handler to the consumed conversation. The actual form calls that handler and disables submit while pending or invalid. List, detail, create, reply and status failure copy and bug-report escape hatches remain checked. |

Home's old `Hero`/`HomeHeroActions` locations, decorative Live Now copy and secondary See How It Works label no longer define the accepted content-led Home body. The current User UI and Shared Brand doctrine own its visual composition; this lock preserves account entry and routing rather than restoring a retired body.

## Retained control ownership

`check:user-critical-path-lock` remains a required child of `check:user-creator-phase-one`. Its eleven section names, report key and report path stay compatible. The `promoReadinessNotes` field is retained as a legacy schema key with an explicit source-only evidence classification. Changed-file metadata is the current Git worktree snapshot captured before this report is published; it is not proof of authorization or a diff against a prior release.

`check:user-critical-path-launch` is retained separately for its historical UCP issue/route/countdown acceptance. It does not replace current journey bindings. The payment/unlock, wallet source-of-funds, Chat and auth/security checks retain their unique server and failure controls. No command or required gate is removed by this transfer.

## Targeted verification

- `npm run check:user-critical-path-lock`
- `npm run typecheck`
- `npx vitest run tests/unit/chat-send-feedback.spec.ts`
- When this reader changes, run the existing `tests/unit/user-loading-wallet-mobile-refinement.spec.ts` connected-owner cases. They execute the actual CLI in an isolated input/output tree and challenge wrong handoffs, disconnected controls, comments and valid aliases.

Do not infer broader completion from these checks. Full checks, browser tooling and deployments require their own affected scope and authority; they are not automatic follow-ups to this source lock. Admin/debug product surfaces remain outside its user-journey contract.
