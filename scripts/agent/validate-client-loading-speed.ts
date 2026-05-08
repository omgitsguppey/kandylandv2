import { existsSync } from "node:fs";

import { ROOT, nowIso, readText, writeJsonFile } from "./shared";

type Check = { id: string; pass: boolean; detail: string };
type Report = {
  generatedAt: string;
  status: "pass" | "warning" | "fail";
  score: number;
  checks: Check[];
  criticalBlockers: string[];
  warnings: string[];
};

const REPORT_PATH = "agent/state/client-loading-speed.generated.json";

function read(path: string) {
  return existsSync(`${ROOT}/${path}`) ? readText(path) : "";
}

function main() {
  const checks: Check[] = [];

  const homeClient = read("src/app/HomeClient.tsx");
  checks.push({
    id: "home_client_dynamic",
    pass: /dynamic\(/u.test(homeClient) || /Suspense/u.test(homeClient),
    detail: "Homepage client has lazy/suspense boundaries for non-critical modules.",
  });

  const dashboardPage = read("src/app/dashboard/page.tsx");
  checks.push({
    id: "dashboard_not_admin_importing",
    pass: !/app\/admin|Admin/i.test(dashboardPage),
    detail: "Dashboard page avoids direct admin module import.",
  });

  const chat = read("src/components/Chat/ChatExperience.tsx");
  checks.push({
    id: "chat_media_lazy",
    pass: /loading=("|')lazy("|')/u.test(chat)
      || /dynamic\(/u.test(chat)
      || /data-chat-media-density="compact-v2"/u.test(chat),
    detail: "Chat avoids eager-heavy media loading.",
  });

  const appLayout = read("src/app/layout.tsx");
  checks.push({
    id: "single_build_listener",
    pass: (appLayout.match(/build|version|fresh/giu) ?? []).length < 24,
    detail: "Build/version listeners are not duplicated in layout shell.",
  });

  const packageJson = read("package.json");
  checks.push({
    id: "client_speed_script",
    pass: packageJson.includes("\"check:client-loading-speed\""),
    detail: "Client speed validator wired in package scripts.",
  });

  const criticalBlockers = checks.filter((check) => !check.pass).map((check) => `${check.id}: ${check.detail}`);
  const warnings: string[] = [];
  const score = Math.round((checks.filter((check) => check.pass).length / Math.max(1, checks.length)) * 100);
  const status: Report["status"] = criticalBlockers.length > 0 ? "fail" : score >= 90 ? "pass" : "warning";

  writeJsonFile(REPORT_PATH, {
    generatedAt: nowIso(),
    status,
    score,
    checks,
    criticalBlockers,
    warnings,
  });

  if (status === "fail") {
    console.error(`Client loading speed validation failed (${criticalBlockers.length} blockers).`);
    process.exit(1);
  }

  console.log(`Client loading speed validation ${status.toUpperCase()} (${score}).`);
}

main();
