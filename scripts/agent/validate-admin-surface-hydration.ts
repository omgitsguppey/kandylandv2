import { resolveAdminSurfaceHydrationState } from "../../src/lib/admin/admin-surface-hydration-contract";
import { writeJson, writeMarkdown } from "./admin-hot-cache-heartbeat-shared";

const ready = resolveAdminSurfaceHydrationState({ hasSnapshot: true });
const stale = resolveAdminSurfaceHydrationState({ hasSnapshot: true, isStale: true });
const missing = resolveAdminSurfaceHydrationState({ hasSnapshot: false });
const failures: string[] = [];

if (!ready.shouldRenderShell || !ready.shouldRenderSnapshotValues || ready.shouldRenderSkeleton) failures.push("Ready snapshot hydration must render shell and values without skeleton.");
if (!stale.shouldRenderSnapshotValues || !stale.shouldShowManualRefresh) failures.push("Stale snapshot values must remain visible with refresh guidance.");
if (missing.shouldRenderSnapshotValues || missing.shouldRenderSkeleton || !missing.shouldShowManualRefresh) failures.push("Missing snapshot must show source-missing state without indefinite skeleton.");

writeJson("agent/state/admin-surface-hydration.generated.json", {
  status: failures.length === 0 ? "passed" : "failed",
  states: ["snapshot_ready", "snapshot_stale", "snapshot_missing", "refreshing", "failed", "unauthorized", "no_access"],
  ready,
  stale,
  missing,
});
writeMarkdown("docs/agent-truth/admin-surface-hydration.md", [
  "# Admin Surface Hydration",
  "",
  "- Admin shell renders immediately.",
  "- Cached snapshot values render immediately once the snapshot doc resolves.",
  "- Stale snapshots keep values visible with review freshness.",
  "- Missing snapshots show source-missing/manual-refresh state instead of waiting on broad raw reads.",
]);

if (failures.length > 0) {
  console.error("Admin surface hydration validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Admin surface hydration OK.");
