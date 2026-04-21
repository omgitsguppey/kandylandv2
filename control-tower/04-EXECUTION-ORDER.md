# Execution Order

**MANDATORY:** Every agent must follow this exact 10-step sequence for any future task. Skipping steps is forbidden.

1. **Classify the Task:** Determine if this is a `FOUNDATION`, `ISOLATED_FIX`, `REFACTOR`, etc., using `03-TASK-ROUTING.yaml`.
2. **Identify Owner:** Confirm you are the correct agent to handle this task using `02-AGENT-ROLES.yaml`. If not, request a handoff.
3. **Read Doctrine:** Read the specific doctrine files in `/docs/doctrine/` relevant to the surface you are modifying.
4. **Inspect Source-of-Truth:** Check `06-SOURCE-OF-TRUTH-MAP.yaml`. Where does this data come from? Do not guess.
5. **Inspect Shared Components:** Check `07-SHARED-COMPONENT-OWNERSHIP.yaml` if UI is involved. Do not create a new variant if an owner exists.
6. **Inspect Telemetry/Admin/Audit:** Determine how this change impacts analytics events and the admin diagnostic dashboards.
7. **Inspect Adjacent Logic:** Identify what else is likely to break if you change this state or UI.
8. **Implement:** Write the code. Stay strictly within your ownership boundary.
9. **Verify (Postflight):** Execute the checklist in `12-POSTFLIGHT-CHECKLIST.md`.
10. **Report:** Provide a truthful report stating what changed, what did not, and what requires handoff. Use the template in `09-HANDOFFS.md` if necessary.
