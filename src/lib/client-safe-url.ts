function hasUnsafeRelativeUrlPrefix(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("\\") || trimmed.startsWith("/\\");
}

function hasUnsafeResolvedPathname(pathname: string) {
  return pathname.startsWith("//") || pathname.startsWith("\\") || pathname.startsWith("/\\");
}

export function resolveSameOriginRelativePath(rawUrl: string, currentOrigin: string): string | null {
  if (hasUnsafeRelativeUrlPrefix(rawUrl)) {
    return null;
  }

  try {
    const resolvedUrl = new URL(rawUrl, currentOrigin);
    if (resolvedUrl.origin !== currentOrigin || hasUnsafeResolvedPathname(resolvedUrl.pathname)) {
      return null;
    }

    return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
  } catch {
    return null;
  }
}
