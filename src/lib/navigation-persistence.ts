export const LAST_VISITED_PATH_KEY = "kandydrops:last-visited-path";
export const LAST_VISITED_PATH_COOKIE = "kandydrops_last_path";
export const LAST_VISITED_PATH_OWNER_KEY = "kandydrops:last-visited-path-owner";
export const LAST_VISITED_PATH_OWNER_COOKIE = "kandydrops_last_path_owner";
export type NavigationRole = "admin" | "creator" | "user";

function reportNavigationStorageIssue(scope: string, error: unknown, detail?: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  void import("@/lib/client-error-reporting")
    .then(({ reportStorageIssue }) => {
      reportStorageIssue(scope, error, detail);
    })
    .catch(() => undefined);
}

function isPersistableAppPath(path: string) {
  return (
    path.startsWith("/")
    && path !== "/"
    && !path.startsWith("/api")
  );
}

function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}

function getDefaultAppPathForRole(role: NavigationRole | null | undefined) {
  return role === "admin" ? "/admin" : "/dashboard";
}

export function resolvePreferredAuthenticatedPath(
  role: NavigationRole | null | undefined,
  candidatePath: string | null | undefined,
  candidateOwnerId?: string | null,
  ownerId?: string | null,
) {
  const fallbackPath = getDefaultAppPathForRole(role);
  if (!candidatePath || !isPersistableAppPath(candidatePath)) {
    return fallbackPath;
  }

  if (ownerId && candidateOwnerId && candidateOwnerId !== ownerId) {
    return fallbackPath;
  }

  if (role !== "admin" && isAdminPath(candidatePath)) {
    return fallbackPath;
  }

  return candidatePath;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

function readLastVisitedPath() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.sessionStorage.getItem(LAST_VISITED_PATH_KEY);
    return value && isPersistableAppPath(value) ? value : null;
  } catch (error) {
    reportNavigationStorageIssue("navigation persistence read path", error, {
      storageKey: LAST_VISITED_PATH_KEY,
    });
    return null;
  }
}

function readLastVisitedPathOwner() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.sessionStorage.getItem(LAST_VISITED_PATH_OWNER_KEY);
    return value && value.length > 0 ? value : null;
  } catch (error) {
    reportNavigationStorageIssue("navigation persistence read owner", error, {
      storageKey: LAST_VISITED_PATH_OWNER_KEY,
    });
    return null;
  }
}

function writeLastVisitedPathOwner(ownerId: string | null | undefined) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (!ownerId) {
      window.sessionStorage.removeItem(LAST_VISITED_PATH_OWNER_KEY);
      clearCookie(LAST_VISITED_PATH_OWNER_COOKIE);
      return;
    }

    window.sessionStorage.setItem(LAST_VISITED_PATH_OWNER_KEY, ownerId);
    writeCookie(LAST_VISITED_PATH_OWNER_COOKIE, ownerId, 60 * 60 * 24 * 30);
  } catch (error) {
    reportNavigationStorageIssue("navigation persistence write owner", error, {
      storageKey: LAST_VISITED_PATH_OWNER_KEY,
      ownerId: ownerId || "",
    });
  }
}

export function readPreferredAuthenticatedPath(role: NavigationRole | null | undefined, ownerId?: string | null) {
  return resolvePreferredAuthenticatedPath(
    role,
    readLastVisitedPath(),
    readLastVisitedPathOwner(),
    ownerId,
  );
}

export function writeLastVisitedPath(path: string, ownerId?: string | null) {
  if (typeof window === "undefined" || !isPersistableAppPath(path)) {
    return;
  }

  try {
    window.sessionStorage.setItem(LAST_VISITED_PATH_KEY, path);
  } catch (error) {
    reportNavigationStorageIssue("navigation persistence write path", error, {
      storageKey: LAST_VISITED_PATH_KEY,
      path,
    });
  }

  writeCookie(LAST_VISITED_PATH_COOKIE, path, 60 * 60 * 24 * 30);
  writeLastVisitedPathOwner(ownerId);
}

export function syncLastVisitedPathOwner(ownerId: string | null) {
  const existingOwner = readLastVisitedPathOwner();
  if (existingOwner && ownerId && existingOwner !== ownerId) {
    clearLastVisitedPath();
    writeLastVisitedPathOwner(ownerId);
    return;
  }

  if (!ownerId) {
    clearLastVisitedPath();
    return;
  }

  writeLastVisitedPathOwner(ownerId);
}

export function clearLastVisitedPath() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(LAST_VISITED_PATH_KEY);
  } catch (error) {
    reportNavigationStorageIssue("navigation persistence clear path", error, {
      storageKey: LAST_VISITED_PATH_KEY,
    });
  }

  clearCookie(LAST_VISITED_PATH_COOKIE);
  writeLastVisitedPathOwner(null);
}
