# Legacy Code & Regression Prevention Handling

**Goal:** Establish durable guardrails for navigating, repairing, and eventually decommissioning legacy pathways within KandyDrops ensuring we do not generate invisible regressions.

## Checklist

### 1. Legacy Discovery
- [ ] Determine when to preserve vs unroll legacy code behavior. 
- [ ] Identify shadow or abandoned code paths by observing stale metrics pipelines. 
- [ ] Define the process and validation chain for deleting dead components (ensure no other modules inherit or alias those exports implicitly).

### 2. Code Segregation
- [ ] If replacing a legacy module is too broad or high-risk (e.g. Auth pipelines, deep checkout components), quarantine it behind explicit Adapter wrappers. This localizes blast radii.
- [ ] Maintain an updated roster in repo-memory of what components remain "partially legacy".

### 3. Regression Prevention Rules
- [ ] Block deployment of any alternate temporary tracking paths unless they are strictly registered in the canonical telemetry system. Temporary does not mean lawless. 
- [ ] Block all new derived metrics pipelines that do not trace back explicitly to a single, verified canonical source of truth.
- [ ] Prohibit the usage of silent Javascript catch blocks (`try { ... } catch (e) {}`). All failure edges must bubble, re-throw gracefully, or log telemetry.
- [ ] Ensure any newly added tests mapping legacy functions adhere exactly to how those components behave natively, and do not fake optimistic edge cases.
