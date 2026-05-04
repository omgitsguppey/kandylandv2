import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { TELEMETRY_EVENT_NAMES, TELEMETRY_EVENT_ALIAS_MAP } from "@/lib/telemetry-catalog";
import { TRACKING_SURFACE_MAP, TRACKING_SURFACE_SCORE_TOTAL } from "@/lib/behavioral/tracking-surface-map";

import { ROOT, writeJsonFile } from "./shared";

type CoverageSeverity = "info" | "moderate" | "major" | "critical";

type CoverageFinding = {
  id: string;
  severity: CoverageSeverity;
  surfaceId: string;
  title: string;
  filePath: string;
  evidence: string[];
  suggestedFix: string;
};

type SurfaceCoverageResult = {
  id: string;
  label: string;
  weight: number;
  score: number;
  status: "covered" | "partial" | "missing";
  files: string[];
  coveredEvents: string[];
  missingEvents: string[];
  findings: CoverageFinding[];
};

export type TrackingSurfaceCoverageReport = {
  generatedAt: string;
  overallScore: number;
  status: "pass" | "warning" | "fail";
  criticalFailure: boolean;
  surfaces: SurfaceCoverageResult[];
  topFindings: CoverageFinding[];
  criticalFindings: CoverageFinding[];
  commandBudget: {
    allowed: string[];
    forbidden: string[];
  };
};

const REPORT_PATH = "agent/state/tracking-surface-coverage.generated.json";
const CATALOG_EVENT_SET = new Set([...TELEMETRY_EVENT_NAMES, ...Object.keys(TELEMETRY_EVENT_ALIAS_MAP)]);

function stableId(parts: string[]) {
  return parts.join("__").toLowerCase().replace(/[^a-z0-9_]+/g, "_");
}

function readRepoFile(repoPath: string) {
  const absolutePath = path.join(ROOT, repoPath);
  if (!existsSync(absolutePath)) {
    return "";
  }

  return readFileSync(absolutePath, "utf8");
}

function hasAny(source: string, terms: string[]) {
  return terms.some((term) => source.includes(term));
}

function buildFinding(input: Omit<CoverageFinding, "id">): CoverageFinding {
  return {
    ...input,
    id: stableId([input.surfaceId, input.filePath, input.title]),
  };
}

function scoreSurface(): SurfaceCoverageResult[] {
  return TRACKING_SURFACE_MAP.map((surface) => {
    const fileSources = surface.files.map((filePath) => ({ filePath, source: readRepoFile(filePath) }));
    const joinedSource = fileSources.map((entry) => entry.source).join("\n");
    const findings: CoverageFinding[] = [];

    const coveredEvents = surface.events.filter((eventName) => joinedSource.includes(eventName));
    const missingEvents = surface.events.filter((eventName) => !joinedSource.includes(eventName));

    for (const eventName of surface.events) {
      if (!CATALOG_EVENT_SET.has(eventName)) {
        findings.push(buildFinding({
          severity: "critical",
          surfaceId: surface.id,
          title: `Telemetry catalog is missing ${eventName}`,
          filePath: "src/lib/telemetry-catalog.ts",
          evidence: [eventName],
          suggestedFix: `Add ${eventName} to the canonical telemetry catalog.`,
        }));
      }
    }

    for (const missingEvent of missingEvents) {
      findings.push(buildFinding({
        severity: surface.critical ? "critical" : "major",
        surfaceId: surface.id,
        title: `${surface.label} is missing ${missingEvent}`,
        filePath: surface.files[0],
        evidence: [missingEvent],
        suggestedFix: `Wire ${missingEvent} through the canonical tracking path for ${surface.label}.`,
      }));
    }

    for (const requiredField of surface.requiredFields) {
      if (!joinedSource.includes(requiredField)) {
        findings.push(buildFinding({
          severity: surface.critical ? "major" : "moderate",
          surfaceId: surface.id,
          title: `${surface.label} does not expose ${requiredField}`,
          filePath: surface.files[0],
          evidence: [requiredField],
          suggestedFix: `Add ${requiredField} to the event payload for ${surface.label}.`,
        }));
      }
    }

    for (const serverTruthEvent of surface.serverTruthEvents ?? []) {
      const serverTracked = hasAny(joinedSource, [
        `trackServerEvent("${serverTruthEvent}"`,
        `trackServerEvent('${serverTruthEvent}'`,
        `recordCanonicalTaskEvent(`,
        `eventName === "${serverTruthEvent}"`,
      ]);
      if (!serverTracked) {
        findings.push(buildFinding({
          severity: "critical",
          surfaceId: surface.id,
          title: `${serverTruthEvent} is not provably server-truth backed`,
          filePath: surface.files[surface.files.length - 1],
          evidence: [serverTruthEvent],
          suggestedFix: `Ensure ${serverTruthEvent} is written from a server route or canonical task event path.`,
        }));
      }
    }

    const scorePenalty = findings.reduce((total, finding) => (
      total + (finding.severity === "critical" ? 5 : finding.severity === "major" ? 3 : 1)
    ), 0);
    const score = Math.max(0, surface.weight - Math.min(surface.weight, scorePenalty));
    const status: SurfaceCoverageResult["status"] = score === surface.weight
      ? "covered"
      : score === 0
        ? "missing"
        : "partial";

    return {
      id: surface.id,
      label: surface.label,
      weight: surface.weight,
      score,
      status,
      files: surface.files,
      coveredEvents,
      missingEvents,
      findings,
    };
  });
}

export function buildTrackingSurfaceCoverageReport(): TrackingSurfaceCoverageReport {
  const surfaces = scoreSurface();
  const findings = surfaces.flatMap((surface) => surface.findings);
  const overallScore = Math.max(
    0,
    Math.round((surfaces.reduce((sum, surface) => sum + surface.score, 0) / TRACKING_SURFACE_SCORE_TOTAL) * 100),
  );
  const criticalFindings = findings.filter((finding) => finding.severity === "critical");

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    status: criticalFindings.length > 0 ? "fail" : overallScore >= 90 ? "pass" : "warning",
    criticalFailure: criticalFindings.length > 0,
    surfaces,
    topFindings: findings.slice(0, 12),
    criticalFindings,
    commandBudget: {
      allowed: [
        "npm run score:tracking-surface-coverage",
        "npm run check:tracking-surface-coverage",
        "npm run typecheck",
      ],
      forbidden: [
        "npm run check",
        "npm run check:ui:audits",
        "playwright",
        "cypress",
        "lighthouse",
      ],
    },
  };
}

const report = buildTrackingSurfaceCoverageReport();
writeJsonFile(REPORT_PATH, report);

console.log(`Tracking surface coverage: ${report.overallScore}/100 (${report.status})`);
for (const surface of report.surfaces) {
  console.log(`- ${surface.label}: ${surface.score}/${surface.weight} (${surface.status})`);
}
