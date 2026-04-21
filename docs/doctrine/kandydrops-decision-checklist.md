# KandyDrops Decision Checklist

**MANDATORY PRE-CHANGE CHECKLIST FOR ALL ANTIGRAVITY AND ENGINEERING WORK**

Before modifying *any* user-facing UI, copy, or product-facing logic, you MUST answer the following questions to ensure compliance with the KandyDrops Doctrine.

1. [ ] **What is the surface's primary job?** *(Consult `kandydrops-surface-matrix.md`)*
2. [ ] **What is the source of truth for the data being displayed?** *(e.g., Firestore `_runtime`, Remote Config, Local State)*
3. [ ] **What event path is affected by this change?** *(Does this change how telemetry is reported?)*
4. [ ] **What admin/audit surface verifies this truth?** *(If you change a user state, where does the Admin see it?)*
5. [ ] **Which doctrine files were consulted?** *(Product, Copy, UI, Matrix)*
6. [ ] **What tone rules apply here?** *(e.g., Flirty? Transactional? Brutally truthful?)*
7. [ ] **What interaction rules apply?** *(e.g., No fake tabs, explicit state labeling)*
8. [ ] **What adjacent logic could this break?** *(e.g., A/B tests in `RolloutContext`)*
9. [ ] **What fallback, stale, or failed states exist for this UI?** *(Are they explicitly labeled?)*
10. [ ] **Why does this change belong in the current shared component system rather than becoming a detached, one-off variant?**

If you cannot answer these questions, **STOP**. Do not proceed with the code changes. Return to the doctrine files or escalate the requirement.
