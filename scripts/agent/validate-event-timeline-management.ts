import { existsSync } from "node:fs";

import { ROOT, nowIso, readText, writeJsonFile } from "./shared";

type Check = { id: string; pass: boolean; detail: string };
const REPORT_PATH = "agent/state/event-timeline-management.generated.json";

function read(path: string) {
  return existsSync(`${ROOT}/${path}`) ? readText(path) : "";
}

function main() {
  const timelineContract = read("src/lib/behavioral/behavioral-timeline-contract.ts");
  const ingestGuest = read("src/app/api/analytics/ingest/route.ts");
  const ingestIdentified = read("src/app/api/analytics/ingest-identified/route.ts");
  const confidence = read("src/lib/behavioral/behavioral-confidence-v2.ts");
  const normalizer = read("src/lib/runtime-facts/normalize-runtime-fact.ts");
  const packageJson = read("package.json");

  const checks: Check[] = [
    {
      id: "timeline_contract_fields",
      pass: ["actorType", "normalizedAction", "sourceTruth", "consentState", "metricEligible"].every((needle) =>
        timelineContract.includes(needle),
      ),
      detail: "Behavioral timeline contract includes canonical fact fields.",
    },
    {
      id: "guest_ingest_timeline",
      pass: /timeline|writeBehavioralTimelineFacts/iu.test(ingestGuest),
      detail: "Guest ingest writes normalized timeline facts.",
    },
    {
      id: "identified_ingest_timeline",
      pass: /timeline|writeBehavioralTimelineFacts/iu.test(ingestIdentified),
      detail: "Identified ingest writes normalized timeline facts.",
    },
    {
      id: "normalizer_present",
      pass: /normalize/i.test(normalizer),
      detail: "Runtime fact normalizer is present.",
    },
    {
      id: "ga_optional_only",
      pass: !/ga.*canonical/i.test(confidence),
      detail: "GA is not used as canonical signal in confidence lane.",
    },
    {
      id: "package_script",
      pass: packageJson.includes("\"check:event-timeline-management\""),
      detail: "Event timeline validator is wired.",
    },
  ];

  const blockers = checks.filter((check) => !check.pass).map((check) => `${check.id}: ${check.detail}`);
  const score = Math.round((checks.filter((check) => check.pass).length / checks.length) * 100);
  const status = blockers.length > 0 ? "fail" : "pass";

  writeJsonFile(REPORT_PATH, {
    generatedAt: nowIso(),
    status,
    score,
    checks,
    criticalBlockers: blockers,
    warnings: [],
  });

  if (status === "fail") {
    console.error("Event timeline management validation failed.");
    process.exit(1);
  }

  console.log(`Event timeline management validation passed (${score}).`);
}

main();
