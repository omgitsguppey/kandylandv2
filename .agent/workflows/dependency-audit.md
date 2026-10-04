---
description: "Audit a scoped KandyDrops dependency change without turning routine work into an upgrade sweep."
---

# Dependency Audit Workflow

Use this only for an explicit dependency/security window or a focused compatibility finding. The authoritative state is the relevant manifest plus its lockfile; installed `node_modules` and generated reports are supporting evidence, not the contract.

1. Identify the affected package owner, runtime, manifest, lockfile, and consumer paths before changing a version. Do not bundle unrelated dependency upgrades.

2. Check the existing dependency owners:
   `npm run check:deps`
   `npm run check:dependency-truth`

3. For a confirmed change, inspect upstream release/security notes and license/compatibility impact. Preserve root and Functions package-manager boundaries; do not hand-edit a lockfile or introduce a new package script/validator when an existing owner covers the lane.

   For deployed-source compatibility recovery, trace the artifact's actual selected locked package manager separately from the current checkout. Prove a frozen production install before switching managers or resolving versions. Explicitly deny unwanted dependency lifecycle scripts through that installed manager's supported policy, while keeping unreviewed scripts failing. Omit an inactive stage lock only after tracing install, dependency inspection, framework injection, scripts and runtime consumers; retain the original archive and leave the repository lock owner intact. Local install/import proof still requires separate provider build and serving agreement.

4. Run the smallest relevant verification after the manifest and lockfile are coherent:
   `npm run typecheck`
   `npm run check:consistency`

5. Treat package, lockfile, CI, deployment, Firebase, payment, and provider changes as release-risk. Record the owner, environment, rollback path, cost class, and unresolved advisory separately from source behavior.

6. Do not install, remove, publish, push, merge, deploy, or call a provider merely because this workflow names a dependency. Those actions need the task's explicit authority.
