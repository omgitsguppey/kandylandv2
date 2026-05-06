import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const drawer = readFileSync(join(root, "src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx"), "utf8");
const failures: string[] = [];

for (const expected of [
  "fixed inset-0",
  "overflow-hidden",
  "overscroll-contain",
  "document.body.style.overflow = \"hidden\"",
  "max-w-[calc(100vw-1.5rem)]",
  "min-w-0",
  "max-w-full",
  "break-words",
  "Technical details",
  "<details",
  "Last updated",
]) {
  if (!drawer.includes(expected)) failures.push(`Beta modal must include layout guard: ${expected}`);
}

if (/open=\{true\}|<details[^>]*open/iu.test(drawer)) {
  failures.push("Technical details must stay collapsed by default.");
}

if (!drawer.includes("pb-[calc(0.75rem+env(safe-area-inset-bottom))]")) {
  failures.push("Beta modal must reserve safe bottom space for small mobile browsers.");
}

if (failures.length > 0) {
  console.error("Beta modal layout validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Beta modal layout validation passed.");
