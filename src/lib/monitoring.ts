type MonitoringContext = Record<string, unknown>;

export function captureException(error: unknown, context?: MonitoringContext) {
  console.error("[Monitoring]", error, context ?? {});
}
