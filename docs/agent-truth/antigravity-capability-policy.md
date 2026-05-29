# Antigravity Capability Policy

This policy governs the execution capabilities, allowed activities, and hard limits for Antigravity 2.0.

## Allowed Capabilities
- **Local & Source-Safe Checks**: Antigravity is encouraged to run full TypeScript type-checks, local Vitest suites, and automated ast-grep scanners.
- **Visual-Only Layout Evidence**: Antigravity may utilize browser tools or screenshot outputs solely to check layout bugs, navbar overlaps, safe areas, and mobile/desktop responsive scaling.
- **Async Multi-Agent Work**: Propose multi-agent work if tasks have separate scopes, individual lane owners, and zero overlapping code domains.

## Hard Forbidden Capabilities
- **No Deploys**: Deploying to Firebase App Hosting, Functions, Cloud Run, or App Engine is prohibited.
- **No Provider Calls**: Do not hit actual production PayPal APIs, Firebase databases in production mode, or active external transaction handlers.
- **No Production Mutation**: Changing live user accounts, wallet row values, or billing records in production Firestore/SQL is strictly blocked.
- **No Production Creator Drop Approval**: Admin approvals for creator drops must be run through safe workflows, never approved directly by agents in prod.
- **No Payment/GumDrop Math Changes**: Do not touch PayPal configuration buttons, GumDrop package catalogs, or treasury ledger code.
- **No Source-Only Gate Clearance**: Unit tests or dry-run checks must never be claimed as formal deployed runtime or provider proof.

## Constraints & Memory Rules
1. **Compact Context First**: Compact indexes (`agent/index/`) and registries must be checked before running broad terminal searches like recursive `grep`.
2. **Post-Task Memory Writeback**: Always write back task conclusions, mistakes discovered, and newly established prevention rules to `REPO_MEMORY_LEDGER.md` and `AGENTS.md`.
