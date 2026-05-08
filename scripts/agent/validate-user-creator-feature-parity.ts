import { existsSync } from "node:fs";

import { ROOT, nowIso, readText, writeJsonFile } from "./shared";

type SurfaceStatus = "connected" | "disconnected" | "simulated" | "missing_backend" | "missing_telemetry" | "missing_debug_marker";

type SurfaceCheck = {
  surface: string;
  status: SurfaceStatus;
  detail: string;
};

const REPORT_PATH = "agent/state/user-creator-feature-parity.generated.json";

function fileExists(repoPath: string) {
  return existsSync(`${ROOT}/${repoPath}`);
}

function read(repoPath: string) {
  return fileExists(repoPath) ? readText(repoPath) : "";
}

function main() {
  const checks: SurfaceCheck[] = [];

  checks.push({
    surface: "user_homepage",
    status: fileExists("src/app/page.tsx") ? "connected" : "disconnected",
    detail: "User homepage route present.",
  });
  checks.push({
    surface: "user_dashboard",
    status: fileExists("src/app/dashboard/page.tsx") ? "connected" : "disconnected",
    detail: "User dashboard route present.",
  });
  checks.push({
    surface: "drops_preview_unlock",
    status: fileExists("src/app/drops/[id]/page.tsx")
      || fileExists("src/app/drops/[dropId]/page.tsx")
      || fileExists("src/app/drops/[id]/preview/page.tsx")
      ? "connected"
      : "disconnected",
    detail: "Drop preview route present.",
  });
  checks.push({
    surface: "creator_public_profile",
    status: fileExists("src/app/creators/[username]/page.tsx") ? "connected" : "disconnected",
    detail: "Creator public profile route present.",
  });
  checks.push({
    surface: "creator_dashboard",
    status: fileExists("src/app/dashboard/creator/page.tsx") || fileExists("src/app/creator/page.tsx")
      ? "connected"
      : "disconnected",
    detail: "Creator dashboard route present.",
  });

  const chatSource = read("src/components/Chat/ChatExperience.tsx");
  checks.push({
    surface: "chat_paid_gd_guidance",
    status: /paid|gumdrop|fan pass/i.test(chatSource) ? "connected" : "missing_telemetry",
    detail: "Chat guidance markers are present.",
  });

  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  checks.push({
    surface: "telemetry_catalog",
    status: /chat_|creator_|drop_|wallet_/iu.test(telemetryCatalog) ? "connected" : "missing_telemetry",
    detail: "Telemetry catalog includes user/creator features.",
  });

  const report = {
    generatedAt: nowIso(),
    status: checks.some((entry) => entry.status !== "connected") ? "fail" : "pass",
    checks,
    disconnected: checks.filter((entry) => entry.status === "disconnected"),
    missingTelemetry: checks.filter((entry) => entry.status === "missing_telemetry"),
    simulated: checks.filter((entry) => entry.status === "simulated"),
    missingDebugMarker: checks.filter((entry) => entry.status === "missing_debug_marker"),
  };

  writeJsonFile(REPORT_PATH, report);

  if (report.status === "fail") {
    console.error("User/creator feature parity validation failed.");
    process.exit(1);
  }

  console.log("User/creator feature parity validation passed.");
}

main();
