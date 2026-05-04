import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { DeviceUiDryAuditReport, DeviceUiDryFinding } from "../../src/lib/device-ui-dry-audit";
import {
    ALL_DEVICE_PROFILE_IDS,
    DEVICE_UI_DRY_AUDIT_REPORT_PATH,
    DEVICE_UI_FORBIDDEN_COMMANDS,
    DEVICE_UI_SURFACES,
} from "../../src/lib/device-ui-dry-audit-rules";

const root = process.cwd();
const failures: string[] = [];

function fail(message: string) {
    failures.push(message);
}

function readText(filePath: string) {
    return readFileSync(join(root, filePath), "utf8");
}

function assertFileExists(filePath: string) {
    if (!existsSync(join(root, filePath))) {
        fail(`Missing required file: ${filePath}`);
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validateFinding(finding: DeviceUiDryFinding, index: number) {
    const requiredStringFields = [
        "id",
        "routeOrSurface",
        "deviceProfile",
        "displayMode",
        "category",
        "severity",
        "filePath",
        "expectedRule",
        "actualPattern",
        "humanReadableWarning",
    ] as const;

    for (const field of requiredStringFields) {
        if (typeof finding[field] !== "string" || finding[field].trim().length === 0) {
            fail(`Finding ${index} is missing required string field ${field}`);
        }
    }

    if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) {
        fail(`Finding ${index} must include evidence`);
    }

    if (typeof finding.canAutofix !== "boolean") {
        fail(`Finding ${index} must include canAutofix boolean`);
    }

    if (typeof finding.autofixConfidence !== "number" || finding.autofixConfidence < 0 || finding.autofixConfidence > 1) {
        fail(`Finding ${index} must include autofixConfidence from 0 to 1`);
    }

    if (finding.canAutofix && finding.autofixConfidence < 0.95) {
        fail(`Finding ${index} marks autofixable below 0.95 confidence`);
    }
}

assertFileExists("src/lib/device-ui-dry-audit.ts");
assertFileExists("src/lib/device-ui-dry-audit-rules.ts");
assertFileExists("scripts/agent/score-device-ui-dry-audit.ts");
assertFileExists("docs/agent-truth/device-ui-dry-audit.md");

const packageJson = JSON.parse(readText("package.json")) as { scripts?: Record<string, string> };
if (packageJson.scripts?.["score:device-ui"] !== "tsx scripts/agent/score-device-ui-dry-audit.ts") {
    fail('package.json missing script "score:device-ui"');
}
if (packageJson.scripts?.["check:device-ui"] !== "tsx scripts/agent/validate-device-ui-dry-audit.ts") {
    fail('package.json missing script "check:device-ui"');
}

const reportPath = join(root, DEVICE_UI_DRY_AUDIT_REPORT_PATH);
if (!existsSync(reportPath)) {
    fail(`Missing generated report: ${DEVICE_UI_DRY_AUDIT_REPORT_PATH}`);
} else {
    const parsed = JSON.parse(readFileSync(reportPath, "utf8")) as unknown;
    if (!isRecord(parsed)) {
        fail("Device UI dry audit report must be a JSON object");
    } else {
        const report = parsed as DeviceUiDryAuditReport;
        if (typeof report.generatedAt !== "string" || Number.isNaN(Date.parse(report.generatedAt))) {
            fail("Report generatedAt must be an ISO date string");
        }
        if (typeof report.overallScore !== "number" || report.overallScore < 0 || report.overallScore > 100) {
            fail("Report overallScore must be between 0 and 100");
        }
        if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.overallStatus)) {
            fail("Report overallStatus is invalid");
        }
        if (!isRecord(report.deviceScores)) {
            fail("Report deviceScores must be an object");
        } else {
            for (const deviceProfile of ALL_DEVICE_PROFILE_IDS) {
                const score = report.deviceScores[deviceProfile];
                if (typeof score !== "number" || score < 0 || score > 100) {
                    fail(`Missing or invalid score for device profile ${deviceProfile}`);
                }
            }
        }
        if (!isRecord(report.surfaceScores)) {
            fail("Report surfaceScores must be an object");
        } else {
            for (const surface of DEVICE_UI_SURFACES) {
                const score = report.surfaceScores[surface.id];
                if (typeof score !== "number" || score < 0 || score > 100) {
                    fail(`Missing or invalid score for surface ${surface.id}`);
                }
            }
        }
        if (!Array.isArray(report.findings)) {
            fail("Report findings must be an array");
        } else {
            report.findings.forEach(validateFinding);
        }
        if (report.criticalCount > 0 && report.overallStatus !== "fail") {
            fail("Critical findings must force report status to fail");
        }
        if (typeof report.safeAutofixesAvailable !== "number") {
            fail("Report safeAutofixesAvailable must be numeric");
        }
        if (!Array.isArray(report.recommendedFixOrder)) {
            fail("Report recommendedFixOrder must be an array");
        }
        if (!Array.isArray(report.minimalVerificationCommands)) {
            fail("Report minimalVerificationCommands must be an array");
        }
    }
}

const scannerSource = readText("src/lib/device-ui-dry-audit.ts");
const scoreScript = readText("scripts/agent/score-device-ui-dry-audit.ts");
const validatorSource = readText("scripts/agent/validate-device-ui-dry-audit.ts");
for (const forbiddenCommand of DEVICE_UI_FORBIDDEN_COMMANDS) {
    const forbiddenToken = forbiddenCommand === "npm run check" ? "npm run check " : forbiddenCommand;
    if (scoreScript.includes(forbiddenToken) || scannerSource.includes(`exec(${forbiddenToken}`)) {
        fail(`Device UI dry audit default path references forbidden command: ${forbiddenCommand}`);
    }
}
for (const forbiddenTool of ["playwright", "cypress", "lighthouse"]) {
    if (scoreScript.includes(forbiddenTool) || scannerSource.includes(forbiddenTool)) {
        fail(`Device UI dry audit must not invoke ${forbiddenTool}`);
    }
}
if (/child_process|execSync|spawn\(/u.test(scoreScript) || /child_process|execSync|spawn\(/u.test(scannerSource)) {
    fail("Device UI dry audit must not shell out to broad command runners");
}
if (!validatorSource.includes("autofixConfidence < 0.95")) {
    fail("Validator must enforce autofix confidence >= 0.95");
}

const docs = readText("docs/agent-truth/device-ui-dry-audit.md");
if (!docs.includes("Device UI dry auditing is a deterministic source-level prediction system")) {
    fail("Device UI dry audit doctrine note is missing from docs");
}

if (failures.length > 0) {
    console.error("Device UI dry audit validation failed:");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log("Device UI dry audit validation passed.");
