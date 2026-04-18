import { readFileSync } from "node:fs";
import path from "node:path";

type AuditMode = "runtime" | "accessibility" | "visual";

export type UiAuditTarget = {
  stable_id: string;
  route_or_component: string;
  criticality: "critical" | "high" | "medium";
  blocking_required: boolean;
  audit_target: {
    path: string;
    ready_selector: string;
    hydration_signal: string;
    expected_anchors: string[];
    screenshot_selector: string;
    auth_required: "none" | "user" | "creator" | "admin";
    audit_modes: AuditMode[];
  };
};

function readCoverageFile() {
  const coveragePath = path.resolve(process.cwd(), "agent/index/ui-surface-coverage.json");
  const raw = readFileSync(coveragePath, "utf8");
  return JSON.parse(raw) as {
    surfaces: UiAuditTarget[];
  };
}

function getTargets(mode: AuditMode) {
  const dedupe = new Set<string>();

  return readCoverageFile().surfaces
    .filter((surface) => surface.audit_target && surface.audit_target.auth_required === "none" && surface.audit_target.audit_modes.includes(mode))
    .map((surface) => ({
      stable_id: surface.stable_id,
      route_or_component: surface.route_or_component,
      criticality: surface.criticality,
      blocking_required: surface.blocking_required,
      ...surface.audit_target,
    }))
    .filter((surface) => {
      const key = `${mode}:${surface.path}`;
      if (dedupe.has(key)) {
        return false;
      }
      dedupe.add(key);
      return true;
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

export const ACCESSIBILITY_TARGETS = getTargets("accessibility");
export const RUNTIME_TARGETS = getTargets("runtime");
export const VISUAL_TARGETS = getTargets("visual");
