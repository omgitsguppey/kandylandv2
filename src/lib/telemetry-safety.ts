export type {
    SanitizedTelemetryParams,
    TelemetryScalar,
} from "./analytics/telemetry-safety";

export {
    sanitizeTelemetryParamsForBackend,
    sanitizeTelemetryParamsForGa4,
} from "./analytics/telemetry-safety";
