export type FourXxClass =
  | "static_not_found"
  | "legacy_route"
  | "bot_probe"
  | "unauthorized"
  | "forbidden"
  | "missing_entitlement"
  | "bad_request"
  | "validation_failed"
  | "rate_limited"
  | "expired_content"
  | "unsupported_method"
  | "media_not_found"
  | "analytics_ignored"
  | "unknown";

export type FourXxCostPolicy = {
  routePattern: string;
  class: FourXxClass;
  userFacing: boolean;
  safeToCache: boolean;
  cacheTtlSeconds?: number;
  maxResponseBytes: number;
  logPolicy: "none" | "sampled" | "deduped" | "always";
  sampleRate?: number;
  preAuthRejectAllowed: boolean;
  allowFirestoreBeforeValidation: boolean;
  allowAdminSdkBeforeValidation: boolean;
  debugEvidencePolicy: "none" | "deduped" | "sampled" | "full";
  rateLimitRequired: boolean;
  typedErrorCode: string;
};

export const FOUR_XX_COST_POLICIES: FourXxCostPolicy[] = [
  {
    routePattern: "/.env",
    class: "bot_probe",
    userFacing: false,
    safeToCache: true,
    cacheTtlSeconds: 300,
    maxResponseBytes: 180,
    logPolicy: "deduped",
    preAuthRejectAllowed: true,
    allowFirestoreBeforeValidation: false,
    allowAdminSdkBeforeValidation: false,
    debugEvidencePolicy: "deduped",
    rateLimitRequired: false,
    typedErrorCode: "bot_probe_path_blocked",
  },
  {
    routePattern: "/wp-admin",
    class: "bot_probe",
    userFacing: false,
    safeToCache: true,
    cacheTtlSeconds: 300,
    maxResponseBytes: 180,
    logPolicy: "deduped",
    preAuthRejectAllowed: true,
    allowFirestoreBeforeValidation: false,
    allowAdminSdkBeforeValidation: false,
    debugEvidencePolicy: "deduped",
    rateLimitRequired: false,
    typedErrorCode: "bot_probe_path_blocked",
  },
  {
    routePattern: "/api/analytics/**",
    class: "analytics_ignored",
    userFacing: false,
    safeToCache: false,
    maxResponseBytes: 240,
    logPolicy: "sampled",
    sampleRate: 0.05,
    preAuthRejectAllowed: true,
    allowFirestoreBeforeValidation: false,
    allowAdminSdkBeforeValidation: false,
    debugEvidencePolicy: "sampled",
    rateLimitRequired: true,
    typedErrorCode: "analytics_ignored",
  },
  {
    routePattern: "/api/**",
    class: "bad_request",
    userFacing: true,
    safeToCache: false,
    maxResponseBytes: 300,
    logPolicy: "deduped",
    preAuthRejectAllowed: true,
    allowFirestoreBeforeValidation: false,
    allowAdminSdkBeforeValidation: false,
    debugEvidencePolicy: "deduped",
    rateLimitRequired: true,
    typedErrorCode: "bad_request",
  },
];
