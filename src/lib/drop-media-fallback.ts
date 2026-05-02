export const DROP_COVER_FALLBACK_SRC = "/candy-3d-glass.png";

export function resolvePublicDropCoverSrc(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || DROP_COVER_FALLBACK_SRC;
}
