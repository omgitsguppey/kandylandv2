# Control Tower: START HERE

**ATTENTION ALL AGENTS AND ENGINEERS:**
This is the gateway for future KandyDrops work, not permission to over-read every doctrine file.

**DO NOT** begin UI, copy, state, telemetry, or admin work until you have routed the task through the current compact context and the relevant Control Tower directives.

## Compact-First Read Order
Use the smallest sufficient context pack before opening long doctrine files:
1. Run or read the task pack from `npm run agent:fast-start -- --task="<task>" --mode=<mode> --file=<entrypoint>` or `npm run optimize:doctrine-context -- --task "<task>" --changed <path>`.
2. Read `04-EXECUTION-ORDER.md` to apply the current source-first workflow.
3. Read only the specific Control Tower files named by the task pack, surface map, or execution order.
4. Escalate to the full Control Tower stack only when the task is broad, ownership is unclear, a validator asks for it, or source inspection leaves a doctrine conflict unresolved.

## Key Governance Pointers
* **The Doctrine:** Consult the surface-specific doctrine chosen by the task pack and `08-DOCTRINE-INDEX.md` before making copy, tone, or structural changes. Do not read every Markdown file by default.
* **Role Routing:** If you do not know what kind of task this is, stop and read `15-QUICK-ROUTING.md`.
* **Checklists:** Use `11-PREFLIGHT-CHECKLIST.md` and `12-POSTFLIGHT-CHECKLIST.md` when the task pack or execution order routes you there. Narrow source fixes can use their focused validator lane instead.

This system exists to eliminate inference, improvisation, and ambiguity. Follow it strictly.
