# Execution Order

**MANDATORY:** Every agent must route work through this source-first sequence. Use the compact task context first; do not open the whole doctrine library unless the task is broad, ownership is unclear, or a validator explicitly requires it.

1. **Build Compact Context:** Run or read the generated task context/verification plan for the entrypoint before opening long-form doctrine.
2. **Classify the Task:** Determine if this is a `FOUNDATION`, `ISOLATED_FIX`, `REFACTOR`, etc., using compact context first and `03-TASK-ROUTING.yaml` when needed.
3. **Identify Owner:** Confirm the canonical owner. Use `02-AGENT-ROLES.yaml` only when ownership is ambiguous.
4. **Read Surface Doctrine:** Read the specific doctrine cards/files relevant to the surface being modified.
5. **Inspect Source-of-Truth:** Check the source owner from the task pack or `06-SOURCE-OF-TRUTH-MAP.yaml`. Where does this data come from? Do not guess.
6. **Inspect Shared Components:** Check the shared owner from the task pack or `07-SHARED-COMPONENT-OWNERSHIP.yaml` if UI is involved. Do not create a new variant if an owner exists.
7. **Inspect Telemetry/Admin/Audit:** Determine how this change impacts analytics events, source labels, debug evidence, and admin diagnostic dashboards.
8. **Inspect Adjacent Logic:** Identify what else is likely to break if you change this state or UI.
9. **Implement or Classify:** Write the smallest source fix, retire/demote stale logic, or classify the formal evidence blocker. Stay strictly within the ownership boundary.
10. **Verify and Report:** Run the focused validator lane, then report what changed, what did not, and what still requires formal runtime/provider/admin evidence.

Browser smoke, screenshots, and logged-in sessions are optional diagnostics after source coverage identifies a concrete issue. They are not the first detector and do not clear source, provider, runtime, admin truth, payment, wallet, entitlement, GumDrop source-of-funds, creator revenue, or deployment gates.
