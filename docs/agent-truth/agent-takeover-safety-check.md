# Agent Takeover Safety Check

This verification enforces safety and operational continuity rules whenever a new agent takes over repository execution.

## Checks Enforced
- **Commit Identification**: The latest commit hash on the main branch must be verified and cataloged.
- **Active Lane Identification**: The active task prompt must be mapped directly to the current execution phase.
- **In-Flight Work Isolation**: Multi-agent subtasks must not overlap in code changes or validation domains.
- **Freshness Classification**: Stale generated reports (older than 24 hours) must be explicitly flagged and not treated as current head truth.
- **PR Safety**: Open PRs must not be wholesale merged without cherry-picking and target-score validation.
- **No-Touch Boundaries**: Direct blocks on PayPal SDKs, GumDrop catalogs, wallets, and layout shells must be actively respected.
- **System Memory Update**: Key developer/agent mistakes and rules must be written back to `REPO_MEMORY_LEDGER.md` and `AGENTS.md`.
- **Same-Commit Release Notes**: Release note updates must only occur when actual source code changes are committed.
