import {
  type AdminModuleVerification,
  type AdminSurfaceState,
  type AdminVerificationSource,
  buildAdminModuleVerification,
} from "@/lib/admin-parity";

type BuildServerVerificationInput = {
  module: string;
  canonicalSource: string;
  fallbackSource?: string | null;
  freshnessTimestamp?: number | null;
  lastSuccessfulLiveUpdate?: number | null;
  status?: AdminSurfaceState;
  degradedReason?: string | null;
  countComposition?: Record<string, number>;
  sources?: AdminVerificationSource[];
  staleAfterMs?: number;
  dedupeKey?: string | null;
  clusteringSignature?: string | null;
};

export function buildServerAdminModuleVerification(
  input: BuildServerVerificationInput,
): AdminModuleVerification {
  return buildAdminModuleVerification({
    ...input,
    verifiedAt: Date.now(),
  });
}
