# Current Operator Doctrine

Authority: Current authority for Phase 1 operator workflow and full-loop source-of-truth cleanup.

This document consolidates the current KandyDrops operating doctrine for agents. Older docs remain useful as history, evidence, or surface-specific detail, but this document wins when stale instructions conflict with current Phase 1 source-truth rules.

## Direct Fix Mode vs Audit Mode

Direct Fix Mode is the default when raw code, tests, or generated evidence already proves the defect. The agent must inspect the relevant files, name the broken function/path, remove or replace stale logic, update surrounding callers, update validators/tests, grep for leftovers, and commit the focused fix.

Audit/Triage Mode is reserved for genuinely unknown ownership, unknown route/source mapping, or cross-repo conflicts. Do not use broad investigation language when the broken path is already visible in source.

## Source-First UI Debugging

Screenshots are symptom receipts. Browser views are symptom receipts too, not beta-exit authority and not the first detector. The codebase must tell on itself through source validators, route contracts, hydration markers, error/debug evidence, local fixtures, and client-error fixtures before a human has to inspect the site.

For any future UI or copy change, the active local workflow files are `.agent/skills/doctrine-consultation.md` and `.agent/workflows/ui-copy-refinement-workflow.md`. Root-level `.agent/doctrine-consultation.md` and `.agent/ui-copy-refinement-workflow.md` references are stale path references, not permission to skip doctrine consultation.

Control Tower remains the routing gateway, but it is compact-context first. Agents should run or read the generated task context and then open only the Control Tower and doctrine files selected by the surface, owner, validator, or unresolved conflict. A fixed read-everything sequence is historical friction, not current authority.

Any visual or browser-reported issue must be traced through:

visible label/button/card -> component -> hook/state -> API route/server action -> server helper/source contract -> collection/report/snapshot -> validator/doc.

Do not patch the visible component only when the underlying source, loading, stale/cache, permission, or metric contract is wrong. Browser smoke remains optional diagnostic reproduction after source coverage reports a concrete issue; it must not clear source, runtime, provider, or admin-truth gates by itself. If both a source-smoke lane and a browser-smoke lane exist, the source-smoke lane owns local readiness by default; browser smoke is a promoted diagnostic unless a formal runtime evidence contract explicitly says otherwise.

If an active beta-exit, admin-readiness, or UI-readiness gate asks for manual screenshot evidence, first correct the gate boundary. The source lane should report the route, component, selector or hydration marker, sourceTruth, freshnessState, confidence, nextAction, and whether optional browser reproduction would be useful. A missing screenshot may never be the only reason source readiness is blocked. Nobody should have to look at the site before the codebase can identify a broken modal, disconnected action, missing source, hydration marker gap, or stale UI truth contract. Missing formal runtime, provider, or admin truth evidence can remain blocking, but it must be labeled as formal evidence required rather than screenshot/manual review required.

If an admin surface needs a logged-in view to reproduce, local source proof should still come first through fixture-backed routes, route contracts, selectors, hydration markers, and client-error fixtures. Test accounts and browser sessions are convenience diagnostics, not the source of truth for whether a modal, feature, or action is connected.

Generated task contexts, verification selectors, package-script notes, or older report docs that still describe browser smoke, Playwright, Lighthouse, screenshots, or authenticated test sessions as default-required are stale until their owning tooling slice is corrected. This doctrine overrides those stale selectors for local source readiness. Keep the commands available as opt-in diagnostics or formally promoted runtime evidence, but do not let stale selector wording reintroduce manual/browser proof as the default gate.

Local admin fixtures, selector probes, hydration markers, route-contract checks, and client-error fixtures may clear only the source-readiness lane they actually exercise. They must not be relabeled as deployed runtime smoke, provider smoke, payment proof, admin truth sample evidence, or production operator proof. If a local fixture makes Control Tower/Admin Debug load generated source reports, that is useful source evidence; it is not a formal runtime or admin-truth artifact unless a separate schema-backed contract says so.

## Full-Loop Closure

No backend-only fixes and no UI-only fixes. Every touched feature must close the loop across:

- UI component/card/button
- hook/state/loading/error handling
- API route/server action
- server helper/source contract
- database/report/snapshot/source
- auth, permissions, admin projection, and read-only behavior
- pending/double-submit/race guard
- empty, unavailable, stale, and error states
- cost behavior
- validator, test, docs, and source-of-truth update

## No Additive Patch Stacking

Do not add new wrappers, badges, metrics, snapshots, fallback paths, or helper fields to hide broken old logic. Every fix must either connect to the canonical source, remove stale logic, demote stale logic to Debug/evidence-only, or explicitly mark it deprecated with a validator preventing reuse.

Prefer deleting, merging, or retiring duplicate validators/reports/components over adding another lane. New validators, generated reports, doctrine files, or helper registries are allowed only when they replace or consolidate an existing ambiguous owner, or when no existing lane owns the truth. One-off validators and package-script aliases are a last resort; prefer extending an existing registry or selector and retiring the old alias in the same slice.

If two reports, validators, UI panels, docs, or helper modules disagree about the same truth, do not create a new arbiter. Choose the canonical owner by runtime/source authority, wire callers to that owner, and classify the other lane as legacy adapter, optional diagnostic, archive evidence, or retired. A single connected owner beats several partially correct lanes that keep producing conflicting confidence.

## Consolidation Targets

For posture, doctrine, analytics/admin truth, and repo-intelligence cleanup, use deletion-first targets instead of adding another explanatory layer. In the touched lane, aim to reduce active authority docs/reports, one-off package-script aliases, duplicate validators, redundant admin/debug panels, and browser/screenshot exit gates. Browser smoke can remain optional diagnostic reproduction, but the default exit gate must be source validators, route contracts, hydration markers, debug/error fixtures, and formal evidence artifacts where runtime/provider/admin proof is required.

These targets do not authorize reckless deletion. A file, validator, or panel can be retired only after import/caller/script/report-key searches prove it is duplicate, superseded, archive-only, or disconnected from current source truth. If a lane is still needed for legacy recovery, move it under explicit recovery ownership and label it evidence-only.

Do not collapse the doctrine hierarchy by raw file-count target alone. Current canonical doctrine stays authoritative until a validator-backed consolidation proves a doc, report, package script, or generated artifact is superseded. External audits may propose reduction targets, but repo source, current doctrine, and local validation decide what can be archived. Do not create a replacement `agent/objectives` authority stack or a new simplified doctrine family unless it is part of a focused migration that updates consumers and retires the superseded lane.

Package-script and validator reduction should consolidate execution behind existing registries, selectors, or owner manifests first. Human-friendly aliases may remain when they point to a canonical lane, but one-off scripts should not keep independent truth, independent stale/generated outputs, or independent beta-exit authority after a stronger owner exists.

The desired shape is one coordinated local truth body, not many arms arguing: compact context for agent startup, current operator doctrine for current posture, surface doctrine for UI/server conflict winners, canonical source modules for runtime truth, and formal artifacts for runtime/provider/admin proof. If a cleanup pass finds several docs, scripts, reports, or UI panels explaining the same thing, it should retire or demote the weaker lane only after proving consumers and gates have moved to the canonical owner.

Durable memory writeback is for durable lessons, not proof theater. Update `FULL_SCALE_CODEBASE_AUDIT.md`, `REPO_MEMORY_LEDGER.md`, or `EVERY_FILE_FUNCTION_CHECKLIST.md` when doctrine/governance changes, an owner or validator lane is promoted/retired, verification policy changes, or an owning validator requires memory writeback. Do not add another ledger entry for an ordinary source fix when the commit, tests, targeted report, or source diff already carries the evidence.

## External Audit Intake

External source reviews are hypothesis generators, not repository truth. Before coding from an outside audit, convert each finding into a focused local issue slice with:

- suspected file paths and the canonical owner to inspect
- allowed files and forbidden surfaces
- the exact source-derived evidence boundary
- whether runtime, provider, admin truth, or payment proof remains formal external evidence
- a targeted validator or existing registry lane
- a deletion/consolidation check that searches imports, callers, package scripts, report keys, release gates, score gates, and Admin Debug consumers

The June 2026 GPT source audit is accepted only as a source-review hypothesis. It did not run the local repo, did not prove tests pass, and did not verify deployed/runtime behavior. Its useful signal is direction, not proof: KandyDrops should collapse duplicate validators, reports, manual/browser proof lanes, admin panels, telemetry side paths, and generated evidence sprawl into fewer connected local truth surfaces. Future agents must not answer that audit by adding another validator family, doctrine family, objective stack, generated report family, or dashboard panel unless the same slice retires or replaces the superseded owner.

Numerical reduction targets are advisory cleanup budgets until local source proves a safe consolidation. Do not delete active doctrine, reports, validators, scripts, panels, or evidence gates just to satisfy a percentage. A source pass may retire a lane only when it is duplicate, superseded, archive-only, or disconnected from current owners. A source pass may not lower formal evidence gates by relabeling runtime/provider/admin truth as source proof.

Manual screenshot and browser-smoke requirements must be corrected at the evidence boundary. If the codebase cannot detect a broken admin modal, disconnected action, stale truth label, or hydration gap without a human looking first, add or fix the source lane that reports that issue. Browser reproduction can help after source detection; it is not the primary proof mechanism.

Accepted external-audit direction: reduce validator/report/UI sprawl, make local source lanes identify broken admin surfaces before manual screenshots, keep browser smoke optional by default, and model analytics as `observed`, `modeled`, `inferred`, `cached`, `missing`, `privacy_limited`, or `late_arriving` with confidence and source labels.

Rejected or deferred external-audit direction: do not replace the active Product/Source/Engineering/Surface doctrine hierarchy, doctrine registry, cards, AGENTS routing, or current operator doctrine with a new `agent/objectives` authority stack in a cleanup pass. A smaller posture can be designed later, but only as a focused migration that updates consumers, package scripts, report keys, release gates, score gates, Admin Debug readers, and doctrine validators in the same lane.

External beta score numbers, GitHub-source observations, and commit-history summaries are planning inputs only until checked against the local worktree or formal evidence artifacts. A future coding pass may use them to prioritize, but it must still inspect current source, current generated reports, and the owning validator before changing runtime behavior.

If the outside audit names a GitHub commit, package script, generated score, or UI component state, treat it as stale by default until `git log`, `package.json`, the current local source, and the owning generated artifact agree. The next agent must not quote those numbers or commit summaries as current truth in a code change, report, score gate, release note, or Admin Debug panel without local verification.

External-audit issue candidates must be converted into local source slices before editing. For the current posture, the accepted slices are:

- make admin/browser smoke source-first by default through route contracts, selectors, hydration markers, client-error fixtures, generated source reports, and local admin fixtures; keep browser smoke optional unless a formal runtime evidence contract promotes it
- make creator/admin Drop creation visibly connected by opening the Basics section first, opening the first invalid section on validation error, and showing a compact inline disabled reason when uploads, loading, invalid fields, permissions, or submission block the action
- remove disconnected or overbuilt AI generation panels from ordinary admin create/drop runtime surfaces; keep AI repair/generation logic only behind diagnostics, proposal, or command-owned lanes when it remains useful
- keep Admin AI/debug workbenches action-first: top issue, why it matters, proposed patch plan, and validator/PR readiness, with raw evidence behind drilldown
- consolidate telemetry and analytics through the existing event catalog, `trackEvent`, translation bridge, identity handoff, recovery spine, and materializer owners instead of adding side-channel event queues or metric formulas
- treat numerical reduction targets from outside audits as cleanup budgets only; every file, script, validator, report, panel, or doctrine lane needs local consumer proof before it can be deleted, archived, merged, or retired

The current coding backlog from this audit should be executed as separate source slices, not one sweeping rewrite: source-first admin smoke boundary; creator/admin Drop creation validation clarity; admin create/drop AI panel removal; action-first Admin AI/debug display; package-script/report consolidation only where consumer searches prove duplicate ownership; telemetry/analytics launch recovery through existing catalog, translation bridge, identity handoff, recovery spine, and materializer owners. Each slice must be net-consolidating where practical and must end with a grep for duplicate/stale lanes it touched.

Future prompts from this audit should start as issue-style source slices, not broad repo mandates: selected owner, exact user/admin symptom, source path, allowed files, forbidden protected surfaces, expected consolidation/deletion, targeted validator, and remaining formal evidence. Do not combine creator Drop UX, AI panel removal, telemetry recovery, admin smoke optionality, package-script consolidation, and doctrine reduction into one implementation pass unless the user explicitly accepts that blast radius.

Workflow command lists are menus, not automatic authority. If `.agent/workflows/*`, generated task prompts, package-script descriptions, or historical checklists list GitHub PR commands, `git push`, browser audits, Lighthouse, Firebase rules checks, provider checks, deploy-adjacent checks, or full `npm run check`, those commands are promoted lanes only. They require explicit operator scope, selector promotion, release-risk scope, or a formal evidence contract. Missing GitHub auth, browser artifacts, screenshots, or external command output must not fail local source readiness; it should be classified as external evidence required, optional diagnostic, or tooling debt.

## UI/Button/Action Closure

Every button, link, toggle, or CTA must have:

- real destination or action
- permission/read-only guard
- loading/pending guard
- error path
- disabled/unavailable state
- no double-submit risk
- no self-loop unless it scrolls or focuses a real section
- no placeholder route pretending to be live

If no real route/action exists, remove the fake action, disable it honestly, or label it configuration-only.

## Measurement/Source-Of-Truth

Do not add a new measurement lane until the existing measurement path is traced end-to-end. For every metric/event touched:

- identify the canonical source
- identify duplicate, legacy, diagnostic, and fallback sources
- remove, demote, or label non-canonical sources
- update UI to read canonical metric contracts or snapshots
- keep Debug responsible for formulas, source detail, confidence, and fallback detail
- update validators so duplicate paths cannot return
- add no new event volume unless explicitly required

Every analytics/admin metric must carry a source state and confidence posture. Use explicit states such as `observed`, `modeled`, `inferred`, `cached`, `missing`, `privacy_limited`, `late_arriving`, and `external_proof_required`. Do not collapse modeled, inferred, cached, missing, or privacy-limited values into zero. Do not call source-only or generated evidence runtime truth.

Canonical telemetry emission should route through the existing telemetry/event catalog, translation bridge, identity handoff, and materializer owners. Components may call semantic helpers, but they must not own retry, cadence, queueing, privacy, identity, or duplicate metric behavior.

GA4, legacy analytics, and recovery imports may use observed/modeled/inferred language as evidence posture only. They can calibrate confidence, explain gaps, or suggest a manual recovery queue, but they cannot establish wallet balances, GumDrop source-of-funds, entitlement unlocks, creator revenue, payments, or canonical user-level product truth.

External analytics patterns, including consent-mode modeling, late attribution windows, and visibility/counting definitions, are implementation references only after official-source verification. They must be mapped into KandyDrops-owned contracts and enum names instead of copied in as a second truth system. Use `modeled` as the canonical KandyDrops spelling. If outside docs, legacy reports, or unfinished source work use `modelled`, treat it as a compatibility alias at the boundary and schedule a focused cleanup instead of adding a second state or duplicate metric formula.

Official Google/YouTube measurement docs are reference material for posture, not KandyDrops authority. GA4 modeled key events and behavioral modeling use observed/held-back data and high-confidence thresholds; GA4 attribution/freshness can change after the first report; YouTube impressions count only specific visible thumbnail exposures. KandyDrops may borrow those ideas only by mapping them into `observed`, `modeled`, `inferred`, `cached`, `missing`, `privacy_limited`, and `late_arriving` states with local source owners, confidence, dedupe keys, and product-truth boundaries.

## Metric Cadence + Math Precision

No fake realtime. No random snapshots as truth. No badge/disclaimer sprawl in primary UI.

Every displayed metric must have:

- metricKey
- label
- canonicalSource
- formula
- unit
- timeWindow
- refreshCadence
- lastRefreshedAt
- freshnessTolerance
- exactness: exact | derived | estimated | unavailable
- fallbackPolicy
- zeroPolicy
- debugSourceDetail

Primary UI shows the number plus one compact freshness line: `Updated X ago` or `Unavailable`.

Debug shows source, formula, cadence, fallback, confidence, and legacy warnings.

## Metric Classes

- exact: direct canonical source proof for the selected window.
- derived: computed from canonical or approved source fields with a visible formula.
- estimated: directional or recovered evidence; never present as exact.
- unavailable: missing, stale beyond tolerance, or unsupported by the selected source.
- modeled: confidence-scored reconstruction from approved source signals; never wallet, entitlement, unlock, creator revenue, or source-of-funds truth.
- inferred: weaker directional evidence or legacy recovery context; debug/admin-recovery only unless strict source proof promotes it.
- cached: verified snapshot still inside its trust contract; age changes the label or refresh priority, not the truth class.
- privacy_limited: lawful source cannot expose the full behavior; show limited/collecting/source_missing rather than zero.
- late_arriving: source data is expected to hydrate after cadence or materialization delay; show delayed/collecting until bounded proof exists.

A zero is a number. Missing data is not zero. Object presence is not truth. No fake live. No fake healthy. No fake ready. No estimate displayed as exact. No diagnostic/fallback value displayed as canonical. A snapshot is only cached output of a known formula over a known source and refresh window. No generated-report snapshot treated as live authority unless a current contract explicitly consumes it and freshness/current-head checks pass.

## Watch-Time Truth

Canonical watch time comes from valid watch-session rollups only:

`analytics_watch_sessions.validWatchMs` where `watchScoreSource = watch_session_rollup`.

`watchSecondsTotal`, page duration, `viewerOpenMs`, `diagnosticEstimate`, and legacy page duration are fallback/diagnostic only unless explicitly labeled. Diagnostic estimates cannot populate canonical `watchTimeMs`.

## Creator Feature Connection Truth

Creator Dashboard, Fan Pass, requests, calls/bookings, chat, broadcasts, earnings, and audience must be source-connected.

Fan Pass is guidance/configuration-only unless a real purchase/subscription flow is connected. Paid GD only, never reward/free GD.

Requests and bookings are inline/configuration-only unless dedicated management destinations exist. Do not restore fake `Open section` links back to `/dashboard/creator`.

Chat links only if `/dashboard/chat` exists and messaging is enabled and unrestricted. Paid GD guidance does not imply chat availability.

Broadcasts must not fetch or send while restricted, read-only projected, or missing `creatorId`.

Creator/admin Drop creation must feel connected on mobile and desktop. If a create flow uses collapsible sections, open Basics by default, auto-open the first invalid section on validation failure, and show a compact inline footer reason when submit is disabled by uploads, loading, invalid fields, permissions, or submission state. Do not make hidden required fields feel like a dead button.

AI generation panels do not belong in the ordinary admin create-drop runtime surface unless they are fully connected, source-truthed, and necessary to the workflow. Preserve AI repair/generation logic behind diagnostics, proposal, or command-owned lanes when useful; strip disconnected or overbuilt AI UI panels from core create/drop admin flows.

## Admin Debug / Admin Analytics Separation

Admin Debug is the control room, not the main product UI. Debug may show stale, missing, source, formula, fallback, and validator detail. Admin primary panels should not drown in disclaimers.

Reserve `stale` for expired, source-invalid, or untrustworthy evidence. A verified hot-cache or snapshot inside its trust window should show `cached`, `refresh due`, or `last updated`, not scary stale truth. Stale shown as live/current is a bug. Debug should expose owning validator or refresh command when possible.

Admin AI/debug workbenches should be compact and action-first: top issue, why it matters, proposed patch plan, and validator/PR readiness. Raw evidence, grouped 4xx, duplicate warnings, and model details belong behind drilldown.

## Score/Readiness Evidence Truth

Public beta score must read formal evidence artifacts directly. Provider smoke does not come from final-launch-report string parsing. Operator-reported PayPal is tracked, not formal provider smoke. Targeted behavior evidence is not visual QA, runtime smoke, provider smoke, real-device smoke, or admin truth sample evidence. Local validators are not deployed runtime smoke. Browser smoke is optional diagnostic reproduction, not beta-exit authority. Local UI/admin source smoke should be the default code-readiness gate through selectors, route contracts, hydration markers, debug/error evidence, client-error fixtures, and local fixtures. The score can stay low if formal provider/runtime/admin evidence is honestly missing.

Admin browser-smoke commands may exist only as opt-in diagnostics. The default admin readiness lane must be source-only and account-free when possible: route contract, component marker, selector/hydration marker, fixture-backed source report, no raw production reads, no provider calls, and no manual screenshot requirement. Browser diagnostics must not clear or block beta exit unless a separate formal runtime evidence contract explicitly promotes them. Local admin fixture routes may load generated source reports for test sessions, but they must label those reports as source snapshots and cannot turn them into runtime, provider, or admin-truth proof.

Manual proof counters should be replaced by variable, source-derived truth states wherever local source can know the answer. Use `source_clear`, `source_missing`, `bridge_missing`, `materializer_missing`, `external_proof_required`, `runtime_proof_required`, or `admin_truth_required` instead of asking the operator for generic proof. Do not display generic "manual proof", "unknown evidence", or screenshot-required stats when the codebase can derive a specific missing source lane, missing bridge, missing materializer, route/selector gap, fixture gap, or formal artifact requirement. Formal runtime/provider/admin evidence gates may remain, but they must state the artifact needed and what local source already proves.

Source-first UI proof does not weaken formal external proof. If beta exit or release readiness requires deployed runtime smoke, provider smoke, admin truth sample, payment proof, wallet proof, entitlement proof, GumDrop source-of-funds proof, creator revenue proof, or deployment evidence, the gate should remain blocked until the typed artifact exists. The doctrine change is that the missing artifact must be named truthfully; it must not appear as a generic screenshot/manual-proof task or as a local source failure.

Older launch/readiness docs that say screenshot QA, manual visual proof, or browser smoke is required are historical unless a current validator explicitly promotes a visual contract. Admin truth samples must be structured, redacted, and machine-readable first: JSON/source sample, route/report key, freshness timestamp, sample count, and source-state labels. A screenshot can accompany that artifact as optional visual context, but it cannot clear admin truth, provider smoke, deployed runtime smoke, payment proof, wallet proof, GumDrop source-of-funds proof, creator revenue proof, or source readiness on its own.

## Release-Note Automation Rule

Public Beta release notes track accepted public beta releases, not raw commits. A focused source/config/UI patch does not automatically become a visible Beta badge update unless it is accepted into the public release-note bundle.

When the operator accepts a public beta release-note update, the release-note artifacts should ship with the release bundle or accepted patch slice, not as an accidental follow-up loop. Release-note-only commits are manual recovery only, must not trigger another release-note loop, and must use `[skip release-notes]`. Do not create another Beta badge commit for a release-note-only recovery commit. A skipped Public Beta Release Notes workflow is not a failure when the commit only touches release-note artifacts.

GitHub Actions hosted-runner billing lock is external and not app failure. Firebase App Hosting rollout status and GitHub Actions billing status are separate.

## Cost/Race-Condition Rules

No new broad Firestore reads. No new realtime listeners. No polling loops. No refresh every render. No new metric/event volume unless explicitly required. Prefer cadence-based refresh per component. Debug can explain stale/cache state. Primary UI must not pretend everything is realtime.

Every async identity or creator-context fetch must guard against stale response overwrite. Every mutating action must have permission/read-only checks and pending guards.

## Mobile/Admin Source-Rooted Fix Rule

Mobile admin fixes must be source-first and optionally browser-reproduced. No admin mobile patch may only adjust layout if the underlying source/data state is wrong. Fix the source chain first, then simplify UI.

## Required Future Prompt Structure

Every future Codex prompt must include:

- exact symptom or code defect
- exact files to inspect before editing
- exact stale logic to remove/demote
- exact canonical source to connect
- surrounding callers/routes/UI/tests to inspect
- grep cleanup checks
- targeted validators/tests
- allowed files
- forbidden files
- release-note rule
- commit message
