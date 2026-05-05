import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type TelemetrySeverity = "info" | "minor" | "moderate" | "major" | "critical";
type TelemetryCategory =
  | "catalog"
  | "critical_surface"
  | "payload"
  | "entity_id"
  | "failure_reason"
  | "consent"
  | "enrichment"
  | "privacy"
  | "support_debug"
  | "verification";

type TelemetryParityFinding = {
  id: string;
  severity: TelemetrySeverity;
  category: TelemetryCategory;
  title: string;
  filePath: string;
  line?: number;
  excerpt?: string;
  scoreImpact: number;
  suggestedFix: string;
  canAutofix: boolean;
  escalation: string;
  evidence: string[];
};

type TelemetryCriticalSurface = {
  id: string;
  label: string;
  filePaths: string[];
  eventNames: string[];
  requiredPayloadAny?: string[][];
  requiredPayloadAll?: string[];
  reasonCodeRequired?: boolean;
};

type TelemetryParityReport = {
  score: number;
  status: "clean" | "pass" | "warning" | "beta-risk" | "fail";
  generatedAt: string;
  repoRoot: string;
  findings: TelemetryParityFinding[];
  criticalCount: number;
  majorCount: number;
  safeAutofixesAvailable: number;
  checkedSurfaces: Array<{
    id: string;
    label: string;
    filePaths: string[];
    eventNames: string[];
  }>;
  requiredEvents: string[];
  payloadRequirements: string[];
  commandBudget: {
    allowedCommands: string[];
    forbiddenCommands: string[];
  };
  summary: string;
};

const root = process.cwd();
const REPORT_PATH = "agent/state/telemetry-parity-score.generated.json";

const severityImpact: Record<TelemetrySeverity, number> = {
  info: 0,
  minor: -2,
  moderate: -5,
  major: -10,
  critical: -25,
};

const payloadRequirements = [
  "source_component on critical UI action payloads",
  "route or page_path through payload or canonical enrichment",
  "auth_state through canonical enrichment or explicit auth payload",
  "session_id through canonical enrichment",
  "entity id fields when relevant: drop_id creator_id thread_id ticket_id notification_id task_id",
  "reason_code or equivalent failure_reason/reason_codes for blocked and failed paths",
  "privacy consent respected before anonymous or identified analytics dispatch",
];

const commandBudget = {
  allowedCommands: [
    "npm run score:telemetry",
    "npm run check:telemetry-parity-score",
    "npm run check:event-catalog-telemetry",
  ],
  forbiddenCommands: [
    "playwright",
    "cypress",
    "lighthouse",
    "npm run check",
    "npm run check:ui:audits",
    "npm run check:ui:lighthouse",
  ],
};

const criticalSurfaces: TelemetryCriticalSurface[] = [
  {
    id: "hero_cta",
    label: "Hero CTA",
    filePaths: ["src/components/Landing/HomeHeroActions.tsx"],
    eventNames: ["hero_cta_clicked"],
    requiredPayloadAll: ["source_component"],
    requiredPayloadAny: [["route", "page_path", "destination"]],
  },
  {
    id: "bottom_nav",
    label: "Mobile bottom nav",
    filePaths: ["src/components/Navigation/MobileBottomBar.tsx"],
    eventNames: ["navigation_click"],
    requiredPayloadAll: ["source_component"],
    requiredPayloadAny: [["route", "page_path"], ["destination"]],
  },
  {
    id: "drop_card",
    label: "Drop card view unwrap refill",
    filePaths: ["src/components/DropCard.tsx", "src/components/DropCardLayout.tsx"],
    eventNames: ["view_drop_details", "drop_unlock_attempted", "drop_unwrap_intent_blocked_by_funds"],
    requiredPayloadAll: ["source_component", "drop_id"],
    requiredPayloadAny: [["reason_code", "reason_codes", "failure_reason"]],
    reasonCodeRequired: true,
  },
  {
    id: "featured_carousel",
    label: "Featured carousel click",
    filePaths: ["src/components/FeaturedCarousel.tsx"],
    eventNames: ["featured_slide_clicked"],
    requiredPayloadAll: ["source_component", "drop_id", "position"],
  },
  {
    id: "preview_page",
    label: "Locked preview page open reaction unwrap library keep unwrapping",
    filePaths: [
      "src/components/Drops/LockedDropPreviewClient.tsx",
      "src/components/Drops/LockedDropPreviewView.tsx",
      "src/lib/drop-preview-telemetry.ts",
    ],
    eventNames: [
      "drop_preview_page_viewed",
      "drop_preview_opened",
      "drop_preview_feedback_reacted",
      "drop_preview_cta_clicked",
      "drop_preview_open_library_clicked",
      "drop_preview_keep_unwrapping_clicked",
    ],
    requiredPayloadAll: ["source_component", "drop_id", "creator_id", "auth_state"],
    requiredPayloadAny: [["route", "page_path"], ["reason_code", "reason_codes", "failure_reason"]],
    reasonCodeRequired: true,
  },
  {
    id: "wallet_purchase",
    label: "Wallet package select purchase success failure",
    filePaths: ["src/components/PurchaseModal.tsx"],
    eventNames: ["purchase_package_selected", "begin_checkout", "purchase", "gumdrops_purchase_completed", "gumdrops_purchase_failed"],
    requiredPayloadAll: ["source_component", "package_paid_drops", "package_bonus_drops"],
    requiredPayloadAny: [["failure_reason", "reason_code", "reason_codes"]],
    reasonCodeRequired: true,
  },
  {
    id: "daily_check_in",
    label: "Daily check-in claim",
    filePaths: ["src/components/Dashboard/DailyCheckIn.tsx"],
    eventNames: ["daily_checkin_claimed"],
    requiredPayloadAll: ["source_component"],
    requiredPayloadAny: [["gum_drops_awarded", "reward_amount"]],
  },
  {
    id: "daily_tasks",
    label: "Daily task action",
    filePaths: ["src/components/Dashboard/DailyTasksModule.tsx"],
    eventNames: ["daily_task_action_clicked"],
    requiredPayloadAll: ["source_component", "task_id"],
  },
  {
    id: "chat",
    label: "Chat thread open send fail",
    filePaths: ["src/components/Chat/ChatExperience.tsx"],
    eventNames: ["chat_thread_opened", "chat_message_send_attempted", "chat_message_send_failed", "chat_message_sent"],
    requiredPayloadAll: ["source_component", "thread_id"],
    requiredPayloadAny: [["route", "page_path"], ["reason_code", "reason_codes", "error_code", "error_message"]],
    reasonCodeRequired: true,
  },
  {
    id: "notifications",
    label: "Notifications read action",
    filePaths: [
      "src/components/Navigation/NotificationBell.tsx",
      "src/hooks/useNotifications.ts",
      "src/components/Notifications/NotificationRuntimeBridge.tsx",
    ],
    eventNames: ["notification_opened", "notification_read", "notification_mark_all_read"],
    requiredPayloadAll: ["source_component"],
    requiredPayloadAny: [["notification_id", "idempotency_key"]],
  },
  {
    id: "support_bug_report",
    label: "Support and bug report submit",
    filePaths: [
      "src/components/Feedback/ReportBugButton.tsx",
      "src/components/Support/SupportInbox.tsx",
      "src/app/api/tasks/feedback/route.ts",
      "src/app/api/support/threads/route.ts",
      "src/app/api/support/threads/[threadId]/route.ts",
    ],
    eventNames: ["bug_report_submitted", "support_ticket_created", "support_reply_viewed", "support_reply_sent"],
    requiredPayloadAll: ["source_component"],
    requiredPayloadAny: [["ticket_id", "thread_id", "feedback_id", "context", "contextId"]],
  },
  {
    id: "creator_actions",
    label: "Creator follow alerts experience lane CTA",
    filePaths: [
      "src/app/creators/[username]/CreatorProfileClient.tsx",
      "src/components/Creators/CreatorExperiencesPanel.tsx",
    ],
    eventNames: [
      "creator_followed",
      "creator_notifications_enabled",
      "creator_notifications_disabled",
      "creator_experience_cta_clicked",
    ],
    requiredPayloadAll: ["source_component"],
    requiredPayloadAny: [["creator_id", "creatorId"]],
  },
];

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function readIfExists(filePath: string) {
  const absolutePath = join(root, filePath);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, "utf8");
}

function addFinding(
  findings: TelemetryParityFinding[],
  input: Omit<TelemetryParityFinding, "id" | "scoreImpact" | "canAutofix"> & { canAutofix?: boolean },
) {
  findings.push({
    ...input,
    id: `telemetry-parity-${stableHash(`${input.category}:${input.title}:${input.filePath}:${input.line ?? ""}`)}`,
    scoreImpact: severityImpact[input.severity],
    canAutofix: input.canAutofix ?? false,
  });
}

function catalogHasEvent(catalogSource: string, eventName: string) {
  return catalogSource.includes(`eventName: "${eventName}"`) || catalogSource.includes(`eventName: '${eventName}'`);
}

function collectSurfaceSource(surface: TelemetryCriticalSurface, findings: TelemetryParityFinding[]) {
  const parts: string[] = [];
  for (const filePath of surface.filePaths) {
    const source = readIfExists(filePath);
    if (!source) {
      addFinding(findings, {
        severity: "critical",
        category: "critical_surface",
        title: `${surface.label} source file is missing`,
        filePath,
        suggestedFix: `Restore ${filePath} or update the telemetry parity scorer to the new canonical owner.`,
        escalation: "Missing critical telemetry source cannot be auto-fixed because the owning surface moved or was deleted.",
        evidence: [surface.id],
      });
      continue;
    }
    parts.push(source);
  }
  return parts.join("\n");
}

function collectFindings() {
  const findings: TelemetryParityFinding[] = [];
  const catalogSource = readIfExists("src/lib/telemetry-catalog.ts") ?? "";
  const telemetrySource = readIfExists("src/lib/telemetry.ts") ?? "";

  if (!catalogSource) {
    addFinding(findings, {
      severity: "critical",
      category: "catalog",
      title: "Telemetry catalog is missing",
      filePath: "src/lib/telemetry-catalog.ts",
      suggestedFix: "Restore the canonical telemetry catalog before adding or validating event names.",
      escalation: "Unknown event validation depends on the catalog and cannot be inferred safely.",
      evidence: ["src/lib/telemetry-catalog.ts"],
    });
  }

  for (const eventName of Array.from(new Set(criticalSurfaces.flatMap((surface) => surface.eventNames)))) {
    if (!catalogHasEvent(catalogSource, eventName)) {
      addFinding(findings, {
        severity: "critical",
        category: "catalog",
        title: `Critical event is not cataloged: ${eventName}`,
        filePath: "src/lib/telemetry-catalog.ts",
        suggestedFix: `Add ${eventName} to TELEMETRY_EVENT_OPTIONS with the correct category, source, module, and aliases if any.`,
        escalation: "Do not ship unknown critical telemetry names; catalog the event or replace it with the canonical event.",
        evidence: [eventName],
      });
    }
  }

  for (const expected of ["trackEvent", "readPrivacySettingsSnapshot", "canUseAnonymousAnalytics", "canUseIdentifiedAnalytics"]) {
    if (!telemetrySource.includes(expected)) {
      addFinding(findings, {
        severity: "critical",
        category: "consent",
        title: `Telemetry client is missing consent-aware dispatch anchor: ${expected}`,
        filePath: "src/lib/telemetry.ts",
        suggestedFix: "Restore privacy-consent gating in trackEvent before changing telemetry call sites.",
        escalation: "Consent enforcement cannot be auto-fixed because it governs anonymous and identified analytics.",
        evidence: [expected],
      });
    }
  }

  for (const expected of ["page_path", "session_id", "auth_state", "event_timestamp_ms", "sanitizeTelemetryParamsForBackend"]) {
    if (!telemetrySource.includes(expected)) {
      addFinding(findings, {
        severity: "critical",
        category: "enrichment",
        title: `Telemetry enrichment is missing required field: ${expected}`,
        filePath: "src/lib/telemetry.ts",
        suggestedFix: "Restore canonical event enrichment rather than adding route/session/auth fields to every call site by hand.",
        escalation: "Telemetry ownership and privacy semantics require review if global enrichment is removed.",
        evidence: [expected],
      });
    }
  }

  if (!telemetrySource.includes("recordClientDiagnostic") || !telemetrySource.includes("Unsupported telemetry event ignored")) {
    addFinding(findings, {
      severity: "major",
      category: "verification",
      title: "Unknown event diagnostics are not visibly preserved",
      filePath: "src/lib/telemetry.ts",
      suggestedFix: "Keep unknown telemetry event diagnostics connected to client diagnostics so parity failures surface before manual reports.",
      escalation: "Escalate because removing diagnostics hides telemetry catalog drift.",
      evidence: ["recordClientDiagnostic", "Unsupported telemetry event ignored"],
    });
  }

  for (const surface of criticalSurfaces) {
    const source = collectSurfaceSource(surface, findings);
    if (!source) continue;

    for (const eventName of surface.eventNames) {
      if (!source.includes(eventName)) {
        addFinding(findings, {
          severity: "critical",
          category: "critical_surface",
          title: `${surface.label} is missing critical event ${eventName}`,
          filePath: surface.filePaths[0],
          suggestedFix: `Wire ${eventName} through the existing user action handler with canonical trackEvent/server tracking.`,
          escalation: "Missing critical interaction telemetry must be reviewed by the owner of the surface and telemetry catalog.",
          evidence: [surface.id, eventName],
        });
      }
    }

    for (const field of surface.requiredPayloadAll ?? []) {
      if (!source.includes(field)) {
        addFinding(findings, {
          severity: field === "source_component" ? "major" : "moderate",
          category: field.includes("_id") || field.endsWith("Id") ? "entity_id" : "payload",
          title: `${surface.label} telemetry payload is missing ${field}`,
          filePath: surface.filePaths[0],
          suggestedFix: `Add ${field} to the ${surface.label} telemetry payload using the existing local entity/context value.`,
          escalation: "Payload additions are not auto-fixed because the correct value must come from the current surface state.",
          evidence: [surface.id, field],
        });
      }
    }

    for (const options of surface.requiredPayloadAny ?? []) {
      if (!options.some((field) => source.includes(field))) {
        addFinding(findings, {
          severity: surface.reasonCodeRequired ? "major" : "moderate",
          category: surface.reasonCodeRequired ? "failure_reason" : "payload",
          title: `${surface.label} telemetry payload is missing one of: ${options.join(", ")}`,
          filePath: surface.filePaths[0],
          suggestedFix: `Add the canonical available field from this set: ${options.join(", ")}.`,
          escalation: "The scorer cannot infer the correct payload field without reviewing the action state.",
          evidence: [surface.id, ...options],
        });
      }
    }
  }

  return findings;
}

function statusFor(score: number, criticalCount: number): TelemetryParityReport["status"] {
  if (criticalCount > 0) return "fail";
  if (score >= 95) return "clean";
  if (score >= 90) return "pass";
  if (score >= 80) return "warning";
  if (score >= 70) return "beta-risk";
  return "fail";
}

function buildReport(): TelemetryParityReport {
  const findings = collectFindings();
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
  const majorCount = findings.filter((finding) => finding.severity === "major").length;
  const score = Math.max(0, Math.min(100, 100 + findings.reduce((sum, finding) => sum + finding.scoreImpact, 0)));
  const status = statusFor(score, criticalCount);

  return {
    score,
    status,
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    findings,
    criticalCount,
    majorCount,
    safeAutofixesAvailable: findings.filter((finding) => finding.canAutofix).length,
    checkedSurfaces: criticalSurfaces.map((surface) => ({
      id: surface.id,
      label: surface.label,
      filePaths: surface.filePaths,
      eventNames: surface.eventNames,
    })),
    requiredEvents: Array.from(new Set(criticalSurfaces.flatMap((surface) => surface.eventNames))).sort(),
    payloadRequirements,
    commandBudget,
    summary: findings.length === 0
      ? "Telemetry parity is clean for critical public-beta surfaces."
      : `Telemetry parity found ${findings.length} issue(s) across critical public-beta surfaces.`,
  };
}

function writeReport(report: TelemetryParityReport) {
  const fullPath = join(root, REPORT_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function printSummary(report: TelemetryParityReport) {
  console.log(`Telemetry parity score: ${report.score}/100 (${report.status})`);
  console.log(`Findings: ${report.findings.length} total, ${report.criticalCount} critical, ${report.majorCount} major`);
  console.log(`Safe autofixes available: ${report.safeAutofixesAvailable}`);
  for (const finding of report.findings.slice(0, 5)) {
    const location = finding.line ? `${finding.filePath}:${finding.line}` : finding.filePath;
    console.log(`- [${finding.severity}] ${finding.title} (${location})`);
  }
  console.log(`Allowed next commands: ${report.commandBudget.allowedCommands.join(", ")}`);
  console.log(`Forbidden by default: ${report.commandBudget.forbiddenCommands.join(", ")}`);
}

const report = buildReport();
writeReport(report);
printSummary(report);
