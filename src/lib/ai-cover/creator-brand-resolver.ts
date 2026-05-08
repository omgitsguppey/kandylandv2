export type CoverCreatorBrandInput = {
  titlePrefixBrand?: string | null;
  creatorBrandName?: string | null;
  creatorPublicName?: string | null;
  creatorDisplayName?: string | null;
  creatorProfileFallback?: string | null;
};

function normalize(value?: string | null) {
  const trimmed = (value || "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveCreatorBrand(input: CoverCreatorBrandInput) {
  return (
    normalize(input.titlePrefixBrand)
    ?? normalize(input.creatorBrandName)
    ?? normalize(input.creatorPublicName)
    ?? normalize(input.creatorDisplayName)
    ?? normalize(input.creatorProfileFallback)
    ?? "Creator"
  );
}
