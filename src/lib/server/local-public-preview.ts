import "server-only";

export function isKandyLocalPublicPreview(): boolean {
  return process.env.NODE_ENV === "development" && process.env.KANDY_LOCAL_PUBLIC_PREVIEW === "1";
}
