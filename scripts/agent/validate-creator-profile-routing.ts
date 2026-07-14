import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function requireNotIncludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

const routing = readRequired("src/lib/creator-profile-routing.ts");
const publicPages = readRequired("src/lib/creator-public-pages.ts");
const chat = readRequired("src/components/Chat/ChatExperience.tsx");
const roster = readRequired("src/app/admin/roster/page.tsx");
const viewAs = readRequired("src/components/Admin/AdminCreatorViewAsControls.tsx");
const discovery = readRequired("src/components/CreatorDiscoveryRail.tsx");
const experiences = readRequired("src/components/Creators/CreatorExperiencesPanel.tsx");
const broadcasts = readRequired("src/app/api/creator/broadcasts/route.ts");
const broadcastNotifications = readRequired("src/lib/notifications/creator-broadcast-notifications.ts");
const renewals = readRequired("src/app/api/cron/process-creator-subscriptions/route.ts");
const accountControls = readRequired("src/lib/admin/creator-account-controls.ts");
const notFound = readRequired("src/components/ui/NotFoundSurface.tsx");
const doc = readRequired("docs/agent-truth/creator-profile-routing.md");
const chatDoc = readRequired("docs/agent-truth/user-chat-shell-routing.md");

for (const exportName of [
  "buildCreatorPublicHref",
  "buildCreatorAdminHref",
  "buildCreatorReviewHref",
  "canLinkToCreatorPublicProfile",
  "explainCreatorProfileRouteMissing",
]) {
  requireIncludes(routing, `export function ${exportName}`, "Canonical creator profile routing helper");
}

requireIncludes(routing, "username", "Public creator route must prefer username/handle slugs");
requireIncludes(routing, "handle", "Public creator route must prefer username/handle slugs");
requireIncludes(routing, "uid", "Admin creator route may use uid");
requireIncludes(routing, "synthetic_creator_username_missing", "Synthetic creator route diagnosis");
requireIncludes(routing, "creator_profile_link_clicked", "Creator profile link telemetry");
requireIncludes(routing, "creator_profile_link_missing", "Creator profile missing telemetry");
requireIncludes(publicPages, "from \"@/lib/creator-profile-routing\"", "Legacy public-pages compatibility re-export");

for (const [label, source] of [
  ["Chat header", chat],
  ["Admin view-as controls", viewAs],
  ["Creator discovery rail", discovery],
  ["Creator experiences panel", experiences],
  ["Broadcast notification owner", broadcastNotifications],
  ["Subscription renewal notifications", renewals],
  ["Admin account-control public profile path", accountControls],
] as const) {
  requireIncludes(source, "buildCreatorPublicHref", `${label} canonical public href`);
}

requireIncludes(broadcasts, "@/lib/notifications/creator-broadcast-notifications", "Broadcast route notification owner import");
requireIncludes(broadcasts, "enqueueCreatorBroadcastNotifications", "Broadcast route notification owner delegation");

requireIncludes(chat, "routeSource: \"chat_header\"", "Chat header profile telemetry");
requireIncludes(chat, "creator_profile_link_clicked", "Chat header profile click telemetry");
requireIncludes(chat, "creator_profile_link_missing", "Chat header missing profile telemetry");
requireIncludes(discovery, "routeSource: \"creator_discovery\"", "Discovery profile telemetry");
requireIncludes(viewAs, "routeSource: \"admin_roster\"", "Roster profile telemetry");
requireIncludes(roster, "buildCreatorReviewHref", "Admin Roster review href");
requireIncludes(roster, "buildCreatorAdminHref", "Admin Roster admin href");
requireIncludes(viewAs, "isSyntheticCreator: Boolean(syntheticCreatorType)", "Synthetic creator profile route input");
requireIncludes(discovery, "aria-disabled=\"true\"", "Missing creator href must render safe non-link");
requireIncludes(discovery, "data-creator-profile-missing-reason", "Missing creator href debug reason");

for (const [label, source] of [
  ["Chat header", chat],
  ["Admin view-as controls", viewAs],
  ["Creator discovery rail", discovery],
  ["Creator experiences panel", experiences],
  ["Broadcast route", broadcasts],
  ["Broadcast notification owner", broadcastNotifications],
  ["Subscription renewal notifications", renewals],
  ["Admin account-control public profile path", accountControls],
] as const) {
  requireNotIncludes(source, "`/creators/${", `${label} must not hand-build creator public hrefs`);
  requireNotIncludes(source, "href={`/${", `${label} must not use obsolete root creator profile paths`);
  requireNotIncludes(source, "href=\"#\"", `${label} must not use placeholder creator profile links`);
}

requireIncludes(notFound, "NOT_FOUND_RETURN_HREF = \"/dashboard\"", "404 return route");
requireIncludes(notFound, "Return to App", "404 return copy");
requireIncludes(doc, "creator-profile-routing.ts", "Creator profile routing doc");
requireIncludes(doc, "Do not hand-build", "Creator profile routing doc");
requireIncludes(doc, "synthetic creators", "Creator profile routing doc");
requireIncludes(chatDoc, "buildCreatorPublicHref", "Chat routing doc");
requireNotIncludes(chatDoc, "buildCreatorProfileHref` from `src/lib/creator-public-pages.ts`", "Chat doc must point at canonical builder");

if (failures.length > 0) {
  console.error("Creator profile routing validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Creator profile routing validation passed.");
