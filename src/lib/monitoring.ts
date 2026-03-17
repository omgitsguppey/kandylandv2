type MonitoringContext = Record<string, unknown>;

export function initMonitoring() {
  // Reserved for a future monitoring provider integration.
}

export function captureMessage(message: string, context?: MonitoringContext) {
  console.info("[Monitoring]", message, context ?? {});
}

export function captureException(error: unknown, context?: MonitoringContext) {
  console.error("[Monitoring]", error, context ?? {});
}
