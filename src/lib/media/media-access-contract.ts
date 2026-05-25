import { fingerprintStoragePath } from "./media-upload-contract";

export const MEDIA_ACCESS_CONTRACT_VERSION = "2026.05.private-media-access.1";

export const MEDIA_ACCESS_REASONS = [
  "public_allowed",
  "owner_allowed",
  "creator_allowed",
  "admin_allowed",
  "unlocked_allowed",
  "fan_pass_allowed",
  "chat_thread_participant_allowed",
  "expired_blocked",
  "locked_blocked",
  "purchase_required",
  "auth_required",
  "moderation_blocked",
  "not_found",
  "unsafe_unknown",
] as const;

export const MEDIA_ACCESS_EVENTS = [
  "media_access_allowed",
  "media_access_blocked",
  "media_access_failed",
  "media_asset_missing",
  "media_expired_blocked",
] as const;

export type MediaAccessReason = (typeof MEDIA_ACCESS_REASONS)[number];
export type MediaAccessEventName = (typeof MEDIA_ACCESS_EVENTS)[number];
export type MediaAccessSurface =
  | "chat_attachment"
  | "drop_media"
  | "creator_upload"
  | "profile_timeline_media"
  | "admin_debug";
export type MediaAccessFailureClass =
  | "none"
  | "auth"
  | "purchase_or_unlock"
  | "creator_ownership"
  | "moderation"
  | "expired"
  | "not_found"
  | "unsafe_unknown";
export type MediaAccessSourceTruth =
  | "server_entitlement"
  | "chat_thread_membership"
  | "creator_ownership"
  | "public_discovery"
  | "admin_review"
  | "unknown";

export interface MediaAccessInput {
  surface: MediaAccessSurface;
  mediaId: string;
  assetId?: string | null;
  viewerUserId?: string | null;
  ownerUserId?: string | null;
  creatorId?: string | null;
  isAdmin?: boolean;
  isPublic?: boolean;
  exists?: boolean;
  isLocked?: boolean;
  isExpired?: boolean;
  hasUnlockedDrop?: boolean;
  hasFanPass?: boolean;
  isChatThreadParticipant?: boolean;
  moderationState?: "allowed" | "blocked" | "review" | "unknown" | null;
  storagePath?: string | null;
  storagePathFingerprint?: string | null;
  assetUrl?: string | null;
  route?: string | null;
  sourceTruth?: MediaAccessSourceTruth | null;
}

export interface MediaAccessDecision {
  contractVersion: typeof MEDIA_ACCESS_CONTRACT_VERSION;
  surface: MediaAccessSurface;
  mediaId: string;
  assetId: string | null;
  viewerUserId: string | null;
  ownerUserId: string | null;
  creatorId: string | null;
  allowed: boolean;
  reason: MediaAccessReason;
  eventName: MediaAccessEventName;
  failureClass: MediaAccessFailureClass;
  httpStatus: 200 | 401 | 403 | 404 | 410 | 423 | 500;
  humanReason: string;
  debugReason: string;
  sourceTruth: MediaAccessSourceTruth;
  storagePathFingerprint: string | null;
  assetUrlPolicy: "none" | "public_url_allowed" | "private_url_not_logged" | "signed_url_not_logged";
  route: string | null;
}

export interface MediaAccessTelemetryPayload {
  contractVersion: typeof MEDIA_ACCESS_CONTRACT_VERSION;
  eventName: MediaAccessEventName;
  surface: MediaAccessSurface;
  mediaId: string;
  assetId: string | null;
  viewerUserId: string | null;
  ownerUserId: string | null;
  creatorId: string | null;
  allowed: boolean;
  reason: MediaAccessReason;
  failureClass: MediaAccessFailureClass;
  httpStatus: number;
  sourceTruth: MediaAccessSourceTruth;
  storagePathFingerprint: string | null;
  assetUrlPolicy: MediaAccessDecision["assetUrlPolicy"];
  route: string | null;
  debugLane: "Private media access";
}

export interface PrivateMediaAccessDebugLane {
  label: "Private media access";
  status: "live" | "degraded";
  totalDecisions: number;
  allowed: number;
  blocked: number;
  blockedByReason: Partial<Record<MediaAccessReason, number>>;
  missingAssets: number;
  unsafeUnknown: number;
  expiredOrLockedMismatches: number;
  ownerCreatorAdminBypassHealth: "monitored" | "missing";
  sourceTruth: "media_access_contract";
  privacy: "storage_paths_and_private_urls_redacted";
}

export function cleanMediaAccessText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export function sameMediaAccessIdentity(first: unknown, second: unknown) {
  const left = cleanMediaAccessText(first);
  const right = cleanMediaAccessText(second);
  return left.length > 0 && right.length > 0 && left === right;
}

export function fingerprintMediaAccessStoragePath(input: Pick<MediaAccessInput, "storagePath" | "storagePathFingerprint">) {
  return cleanMediaAccessText(input.storagePathFingerprint) || fingerprintStoragePath(input.storagePath);
}

export function resolveMediaAssetUrlPolicy(input: Pick<MediaAccessInput, "assetUrl" | "isPublic">): MediaAccessDecision["assetUrlPolicy"] {
  const assetUrl = cleanMediaAccessText(input.assetUrl);
  if (!assetUrl) return "none";
  return input.isPublic === true ? "public_url_allowed" : "private_url_not_logged";
}
