import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

const unlockRoute = read("src/app/api/drops/unlock/route.ts");
if (!unlockRoute.includes("usedSubscriptionAccess")) failures.push("Unlock route must evaluate fan-pass subscription access.");
if (!unlockRoute.includes("fanPassUnlockState")) failures.push("Unlock route must emit fan-pass unlock state.");
if (!unlockRoute.includes("unlock_source")) failures.push("Unlock telemetry must declare source.");

const chatServer = read("src/lib/server/chat.ts");
if (!chatServer.includes("purchasedOnly")) failures.push("Chat monetization must remain paid-source gated.");

const creatorSubscriptions = read("src/app/api/creator/subscriptions/route.ts");
if (!creatorSubscriptions.includes("creator_subscription_paid_only")) {
  failures.push("Creator subscription route must preserve paid-source policy marker.");
}

if (failures.length > 0) {
  console.error("Fan pass unlock entitlement validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Fan pass unlock entitlement validation passed.");
