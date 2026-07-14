# Identity Handoff 4xx Policy

- Status: pass
- Current head: dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa
- Guest-to-user handoff: continuity_preserved_duplicate_suppressed
- Individual metric hydration: classified
- Global vs user mismatches surfaced: 3
- Active global vs user mismatches: 0
- Classified non-blocking mismatches: 3
- Expected no-user-mapping events: 3
- Missing identity links (requiring action): 0
- Unsafe unknown mismatches (active bugs): 0
- Identity 4xx classes covered: 14
- Live evidence: actionable_gap

## Next Exact Steps
- Keep user-level panel proof separate from global activity proof.
- Use identity-handoff 4xx classes for stale session, malformed handoff, role drift, and duplicate link paths.
- Do not display zero individual user metrics without provenZero.
