# Agent Takeover Safety Check

This lane owns current local takeover evidence. `scripts/agent/validate-agent-takeover-safety-check.ts` produces and validates the one current record at `agent/state/agent-takeover-safety-check.generated.json`. The self-knowledge, bloat, and output-audit commands are adapters over its relevant sections. The three May projections were retired after consumer tracing; their exact bytes remain in the retained recovery evidence and Git history.

## Reproducible invocation

Create a reviewed `output/<taskKey>/input.json` using the exported `TakeoverTaskInput` contract. It declares the task/authority, exact allowed files, forbidden paths/domains, sole execution lane, unknowns, memory disposition, release classification, addition justification, and actual authority files. This is task input, not a second general operating manual.

Before edits, invoke the existing check with `--start output/<taskKey>/input.json`. It captures current Git source hashes, authority hashes, inherited dirty status, and exact allowed-file copies under `output/<taskKey>/before/*.source`. The suffix preserves raw bytes while preventing compilation of recovery copies. The baseline and task input cannot be silently replaced to excuse a later mutation.

After the declared work and checks, invoke `--record output/<taskKey>/input.json`. It measures changes against that baseline, rejects unexpected or forbidden mutations, verifies triggered durable writeback, classifies missing/stale score and unobserved PR/release evidence, and atomically replaces the current record only after validation. Then run the four existing check commands. No new package alias or report family is required.

Each check binds the record to current Git HEAD, source file hashes, authority hashes, immutable input, and the 24-hour freshness window. A later same-HEAD edit invalidates the record. A failed refresh leaves the prior record intact; restoring the rejected mutation permits the next valid refresh. Retain the local baseline while this record is used; a clone/new task must capture its own baseline. Local task evidence does not clear runtime, provider, admin-truth, device, or release gates.

`knowledge.betaDiagnosticScore` reads the beta owner's composite `overallScore` with freshness classification. Source readiness and release decisions remain in the beta owner's separate verdicts; this task record leaves release readiness `not_assessed`.

## Scoped source validation

Selected source validators accept `--task-input output/<taskKey>/input.json`. The existing takeover owner verifies the immutable baseline, authority, retained originals, current HEAD and every actual mutation against that exact allowlist before the validator runs. Its `mutationScope` records current changes and the full source fingerprint. Unchanged inherited work is preserved baseline evidence; it is not a new incident mutation or proof of behavior. New undeclared/protected changes fail before replacing a report. Without the explicit input, standalone validators retain their whole-worktree incident guards. This adapter does not clear any formal runtime, provider, admin or billing gate.

## Checks Enforced
- **Commit Identification**: The current checkout HEAD must be verified and cataloged; it does not establish the deployed revision.
- **Active Lane Identification**: The active task prompt must be mapped directly to the current execution phase.
- **In-Flight Work Isolation**: This route requires the declared sole-agent lane; broader delegation needs an explicitly scoped owner.
- **Freshness Classification**: Stale generated reports (older than 24 hours) must be explicitly flagged and not treated as current head truth.
- **PR Safety**: Open PRs must not be wholesale merged without cherry-picking and target-score validation.
- **No-Touch Boundaries**: Direct blocks on PayPal SDKs, GumDrop catalogs, wallets, and layout shells must be actively respected.
- **System Memory Update**: Write back only when doctrine/governance, an owner or validator lane, verification policy, or an owning validator requires it. Otherwise record why writeback is not required.
- **Public Beta Release Notes**: Synchronize notes when a user-facing patch is accepted into a public beta release bundle.
