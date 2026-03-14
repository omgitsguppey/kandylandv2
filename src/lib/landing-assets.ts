export const ALLOWED_LANDING_ASSET_KEYS = [
  "landing-hero-1",
  "landing-library-stage",
  "landing-library-thumb-1",
  "landing-library-thumb-2",
  "landing-library-thumb-3",
  "landing-library-thumb-4",
] as const;

const ALLOWED_LANDING_ASSET_KEY_SET = new Set<string>(ALLOWED_LANDING_ASSET_KEYS);

export function isAllowedLandingAssetKey(value: unknown): value is (typeof ALLOWED_LANDING_ASSET_KEYS)[number] {
  return typeof value === "string" && ALLOWED_LANDING_ASSET_KEY_SET.has(value);
}
