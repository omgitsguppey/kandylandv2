# Launch PR Triage

Status: evidence refresh
Recorded: 2026-05-12
Current HEAD: `6955246c6baabf0e8dcaee696dc73a37ff11301d`
Scope: current open PRs only. No PR was merged, closed, rebased, or edited during this pass.

Launch PR triage is a manual decision gate. `agent/state/launch-pr-triage.generated.json` is evidence for `docs/agent-truth/launch-pr-triage.md`; it is not permission to merge stale branches.

## Executive Summary

- Open PRs: 27.
- Launch blockers from PR triage: none proven.
- PR triage freshness: refreshed against current HEAD.
- Current launch evidence still requires visual QA, real-device smoke, provider smoke, admin truth samples, and runtime evidence.
- No PR should be merged before the evidence gates are current.

## Classification Summary

- Close/superseded: #240, #239, #238, #235, #233, #232, #231, #229.
- Needs rebase: #241, #236, #227.
- Still worth merging before launch: none.
- Post-launch: #245, #244, #243, #242, #237, #234, #228, #226, #225, #224, #223, #221, #219, #218, #217, #216.
- Ignore/no launch relevance: none.

## Open PRs

| PR | Classification | Risk | Area | Recommendation |
| --- | --- | --- | --- | --- |
| #245 | Post-launch | Low | Accessibility/UI polish | Review after User-Surface Screenshot QA is complete. |
| #244 | Post-launch | Medium | Repo organization | Keep for post-launch review after evidence gates are current. |
| #243 | Post-launch | Medium | Dependency tooling | Post-launch dependency maintenance; do not merge during evidence refresh. |
| #242 | Post-launch | Medium | Dependency tooling | Post-launch dependency maintenance; do not merge during evidence refresh. |
| #241 | Needs rebase | Medium | Telemetry/onboarding | Rebase and review after launch evidence update; do not merge during this pass. |
| #240 | Close/superseded | Medium | Admin truth | Close or manually diff after evidence gates; do not merge raw. |
| #239 | Close/superseded | Medium | Repo organization | Close or supersede with the newest monolith-risk PR #244. |
| #238 | Close/superseded | Low | Accessibility/UI polish | Close or supersede with the newest targeted accessibility PR #245 if still needed. |
| #237 | Post-launch | Medium | Performance/aggregation | Defer until after launch evidence and screenshot QA; rebase if still useful. |
| #236 | Needs rebase | High | Wallet/economy truth | Manually review after evidence refresh; do not merge raw. |
| #235 | Close/superseded | Medium | Repo organization | Close or supersede with the newest monolith-risk PR #244. |
| #234 | Post-launch | Medium | Performance/aggregation | Defer until after launch evidence and screenshot QA; rebase if still useful. |
| #233 | Close/superseded | Low | Accessibility/UI polish | Close or supersede with the newest targeted accessibility PR #245 if still needed. |
| #232 | Close/superseded | Low | Accessibility/UI polish | Close or supersede with the newest targeted accessibility PR #245 if still needed. |
| #231 | Close/superseded | Medium | Repo organization | Close or supersede with the newest monolith-risk PR #244. |
| #229 | Close/superseded | High | Wallet/economy truth | Close or supersede with newer package metadata audit #236 if still needed. |
| #228 | Post-launch | Medium | Performance/aggregation | Defer until after launch evidence and screenshot QA; rebase if still useful. |
| #227 | Needs rebase | Medium | Performance/aggregation | Rebase if still useful after launch evidence and screenshot QA. |
| #226 | Post-launch | Low | Dependency tooling | Post-launch dependency maintenance; do not merge during evidence refresh. |
| #225 | Post-launch | Low | Dependency tooling | Post-launch dependency maintenance; do not merge during evidence refresh. |
| #224 | Post-launch | Low | Dependency tooling | Post-launch dependency maintenance; do not merge during evidence refresh. |
| #223 | Post-launch | Low | Dependency tooling | Post-launch dependency maintenance; do not merge during evidence refresh. |
| #221 | Post-launch | Medium | Dependency tooling | Post-launch dependency maintenance; do not merge during evidence refresh. |
| #219 | Post-launch | Low | CI/dependency tooling | Post-launch dependency maintenance; do not merge during evidence refresh. |
| #218 | Post-launch | Low | CI/dependency tooling | Post-launch dependency maintenance; do not merge during evidence refresh. |
| #217 | Post-launch | Low | CI/dependency tooling | Post-launch dependency maintenance; do not merge during evidence refresh. |
| #216 | Post-launch | Low | CI/dependency tooling | Post-launch dependency maintenance; do not merge during evidence refresh. |

## Duplicate Group Notes

- Duplicate group `monolith-risk-duplicates`: #244, #239, #235, and #231. Use #244 as the freshest post-launch review candidate.
- Duplicate group `accessibility-toggle-duplicates`: #245, #238, #233, and #232. Use #245 as the freshest post-launch accessibility candidate after screenshot QA.
- Duplicate group `source-of-funds-audit-duplicates`: #236 and #229. Do not merge raw; manually review #236 against current wallet/economy truth if still needed.

## Required Next Action

Run PR Cemetery Cleanup after launch evidence is current. This pass intentionally performed no PR merge, close, rebase, or edit.
