export const LAST_VISITED_PATH_KEY = "kandydrops:last-visited-path";
export const LAST_VISITED_PATH_COOKIE = "kandydrops_last_path";
export const NAV_AUTH_COOKIE = "kandydrops_nav_auth";
export const NAV_ROLE_COOKIE = "kandydrops_nav_role";
export const NAV_UID_COOKIE = "kandydrops_nav_uid";
export type NavigationRole = "admin" | "creator" | "user";

function isPersistableAppPath(path: string) {
  return path.startsWith("/") && path !== "/" && !path.startsWith("/api");
}

function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}

function isDashboardPath(path: string) {
  return path === "/dashboard" || path.startsWith("/dashboard/");
}

function getDefaultAppPathForRole(role: NavigationRole | null | undefined) {
  return role === "admin" ? "/admin" : "/dashboard";
}

export function resolvePreferredAuthenticatedPath(
  role: NavigationRole | null | undefined,
  candidatePath: string | null | undefined,
) {
  const fallbackPath = getDefaultAppPathForRole(role);
  if (!candidatePath || !isPersistableAppPath(candidatePath)) {
    return fallbackPath;
  }

  if (role !== "admin" && isAdminPath(candidatePath)) {
    return fallbackPath;
  }

  if (role === "admin" && isDashboardPath(candidatePath)) {
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
  } catch {
    return null;
  }
}

export function readPreferredAuthenticatedPath(role: NavigationRole | null | undefined) {
  return resolvePreferredAuthenticatedPath(role, readLastVisitedPath());
}

export function writeLastVisitedPath(path: string) {
  if (typeof window === "undefined" || !isPersistableAppPath(path)) {
    return;
  }

  try {
    window.sessionStorage.setItem(LAST_VISITED_PATH_KEY, path);
  } catch {
    // Ignore storage failures in restricted contexts.
  }

  writeCookie(LAST_VISITED_PATH_COOKIE, path, 60 * 60 * 24 * 30);
}

export function clearLastVisitedPath() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(LAST_VISITED_PATH_KEY);
  } catch {
    // Ignore storage failures in restricted contexts.
  }

  clearCookie(LAST_VISITED_PATH_COOKIE);
}

export function clearLegacyNavigationAuthCookies() {
  if (typeof window === "undefined") {
    return;
  }

  clearCookie(NAV_AUTH_COOKIE);
  clearCookie(NAV_ROLE_COOKIE);
  clearCookie(NAV_UID_COOKIE);
}

export function setNavigationAuthCookies(
  role: "admin" | "creator" | "user" | null | undefined,
  uid?: string | null,
) {
  if (typeof window === "undefined") {
    return;
  }

  if (!role || !uid) {
    clearLegacyNavigationAuthCookies();
    return;
  }

  // Legacy client-readable cookies are kept only for backwards compatibility.
  writeCookie(NAV_AUTH_COOKIE, "1", 60 * 60 * 24 * 30);
  writeCookie(NAV_ROLE_COOKIE, role, 60 * 60 * 24 * 30);
  writeCookie(NAV_UID_COOKIE, uid, 60 * 60 * 24 * 30);
}
