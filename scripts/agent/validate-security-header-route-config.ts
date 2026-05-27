import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildSecurityHeaderRouteConfigReport, validateSecurityHeaderRouteConfigReport } from "@/lib/config-hardening/security-header-contract";

const ROOT = process.cwd();
function write(path: string, value: string) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value, "utf8");
}

const report = buildSecurityHeaderRouteConfigReport();
const validation = validateSecurityHeaderRouteConfigReport(report);

write("agent/state/security-header-route-config.generated.json", JSON.stringify({ ...report, validation }));
write("docs/agent-truth/security-header-route-config.md", [
  "# Security Header Route Config",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Security headers classified: ${report.securityHeaders.length}`,
  `Redirect policy: ${report.redirectPolicy.status}`,
  `Image policy: ${report.imageDomainPolicy.status}`,
  `PWA scope: ${report.pwaServiceWorkerScope.status}`,
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Security header route config passed: headers=${report.securityHeaders.length}`);
