export interface BotCrawler4xxPolicyEntry {
  trafficClass:
    | "bot_crawler_unknown_route"
    | "favicon_robots_manifest_noise"
    | "old_static_asset_path"
    | "malformed_scanner_payload"
    | "unsupported_method"
    | "suspicious_path_traversal"
    | "suspicious_open_redirect_probe"
    | "invalid_media_url_probe";
  statusCode: 404 | 405 | 400 | 403 | 422;
  diagnosticPolicy: {
    writeMode: "sampled_hourly_rollup" | "hourly_security_rollup";
    rawPayloadAllowed: boolean;
  };
  productJourneyImpact: "none" | "security_only";
  countsAsUserProductError: boolean;
  securityVisibility: "debug_security_grouped" | "low_priority_noise";
  allowHeaderRequired: boolean;
  telemetryEvent: string;
}

export const BOT_CRAWLER_4XX_POLICY: readonly BotCrawler4xxPolicyEntry[] = [
  {
    trafficClass: "bot_crawler_unknown_route",
    statusCode: 404,
    diagnosticPolicy: { writeMode: "sampled_hourly_rollup", rawPayloadAllowed: false },
    productJourneyImpact: "none",
    countsAsUserProductError: false,
    securityVisibility: "low_priority_noise",
    allowHeaderRequired: false,
    telemetryEvent: "bot_4xx_noise_grouped",
  },
  {
    trafficClass: "favicon_robots_manifest_noise",
    statusCode: 404,
    diagnosticPolicy: { writeMode: "sampled_hourly_rollup", rawPayloadAllowed: false },
    productJourneyImpact: "none",
    countsAsUserProductError: false,
    securityVisibility: "low_priority_noise",
    allowHeaderRequired: false,
    telemetryEvent: "static_asset_4xx_noise_grouped",
  },
  {
    trafficClass: "old_static_asset_path",
    statusCode: 404,
    diagnosticPolicy: { writeMode: "sampled_hourly_rollup", rawPayloadAllowed: false },
    productJourneyImpact: "none",
    countsAsUserProductError: false,
    securityVisibility: "low_priority_noise",
    allowHeaderRequired: false,
    telemetryEvent: "old_asset_4xx_noise_grouped",
  },
  {
    trafficClass: "unsupported_method",
    statusCode: 405,
    diagnosticPolicy: { writeMode: "sampled_hourly_rollup", rawPayloadAllowed: false },
    productJourneyImpact: "none",
    countsAsUserProductError: false,
    securityVisibility: "low_priority_noise",
    allowHeaderRequired: true,
    telemetryEvent: "unsupported_method_4xx_grouped",
  },
  {
    trafficClass: "suspicious_path_traversal",
    statusCode: 403,
    diagnosticPolicy: { writeMode: "hourly_security_rollup", rawPayloadAllowed: false },
    productJourneyImpact: "security_only",
    countsAsUserProductError: false,
    securityVisibility: "debug_security_grouped",
    allowHeaderRequired: false,
    telemetryEvent: "suspicious_path_probe_grouped",
  },
  {
    trafficClass: "suspicious_open_redirect_probe",
    statusCode: 400,
    diagnosticPolicy: { writeMode: "hourly_security_rollup", rawPayloadAllowed: false },
    productJourneyImpact: "security_only",
    countsAsUserProductError: false,
    securityVisibility: "debug_security_grouped",
    allowHeaderRequired: false,
    telemetryEvent: "suspicious_redirect_probe_grouped",
  },
  {
    trafficClass: "invalid_media_url_probe",
    statusCode: 403,
    diagnosticPolicy: { writeMode: "hourly_security_rollup", rawPayloadAllowed: false },
    productJourneyImpact: "security_only",
    countsAsUserProductError: false,
    securityVisibility: "debug_security_grouped",
    allowHeaderRequired: false,
    telemetryEvent: "invalid_media_probe_grouped",
  },
];

export function validateBotCrawler4xxPolicy(entries = BOT_CRAWLER_4XX_POLICY) {
  const failures: string[] = [];
  for (const entry of entries) {
    if (entry.countsAsUserProductError) failures.push(`${entry.trafficClass} counts as user product error.`);
    if (entry.productJourneyImpact !== "none" && entry.productJourneyImpact !== "security_only") failures.push(`${entry.trafficClass} has invalid journey impact.`);
    if (entry.diagnosticPolicy.rawPayloadAllowed) failures.push(`${entry.trafficClass} allows raw payload diagnostics.`);
    if (entry.securityVisibility === "debug_security_grouped" && entry.diagnosticPolicy.writeMode !== "hourly_security_rollup") {
      failures.push(`${entry.trafficClass} suspicious probe is not grouped for security.`);
    }
    if (entry.trafficClass === "unsupported_method" && !entry.allowHeaderRequired) failures.push("unsupported_method lacks Allow header policy.");
  }
  return failures;
}

export function buildBotCrawler4xxPolicyReport(generatedAtUtc = new Date().toISOString()) {
  const validationFailures = validateBotCrawler4xxPolicy();
  return {
    reportKey: "bot-crawler-4xx-policy",
    generatedAtUtc,
    status: validationFailures.length === 0 ? "pass" : "fail",
    botNoiseClassesAdded: BOT_CRAWLER_4XX_POLICY.length,
    suspiciousProbeClasses: BOT_CRAWLER_4XX_POLICY.filter((entry) => entry.securityVisibility === "debug_security_grouped").length,
    productJourneyNoiseBlocked: BOT_CRAWLER_4XX_POLICY.filter((entry) => !entry.countsAsUserProductError).length,
    validationFailures,
  };
}
