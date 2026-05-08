import { isReleaseGeneratedArtifactPath, type PublicReleaseAudience, type PublicReleaseNoteCategory, type PublicReleaseSurfaceCategory } from "./release-version-contract";

export const USER_FACING_RELEASE_SURFACE_CATEGORIES = [
  "App experience",
  "Account & onboarding",
  "Chat & support",
  "Creator tools",
  "Daily tasks",
  "Drops & viewer",
  "Navigation",
  "Notifications",
  "Privacy & security",
  "Wallet",
] as const satisfies readonly PublicReleaseSurfaceCategory[];

export type ReleaseDescriptor = {
  titles: string[];
  audience: PublicReleaseAudience;
  affectedSurfaces: string[];
  surfaceCategory: PublicReleaseSurfaceCategory;
  includesInternalReliability: boolean;
  hiddenFromPublic: boolean;
  userFacing: boolean;
};

export function isUserFacingReleaseSurfaceCategory(category: PublicReleaseSurfaceCategory) {
  return USER_FACING_RELEASE_SURFACE_CATEGORIES.includes(category as (typeof USER_FACING_RELEASE_SURFACE_CATEGORIES)[number]);
}

export function isInternalReliabilityPath(path: string, packageJsonChanged: boolean) {
  const normalizedPath = path.replace(/\\/gu, "/");
  if (isReleaseGeneratedArtifactPath(normalizedPath, packageJsonChanged)) {
    return true;
  }

  return normalizedPath === "CODEX_HANDOFF.md"
    || normalizedPath === "PHASE1_TRUTH_AUDIT.md"
    || normalizedPath === "README.md"
    || normalizedPath === "AGENTS.md"
    || normalizedPath.startsWith("agent/")
    || normalizedPath.startsWith("docs/")
    || normalizedPath.startsWith("scripts/")
    || normalizedPath.startsWith(".github/")
    || normalizedPath.startsWith("tests/")
    || normalizedPath.endsWith(".md")
    || normalizedPath.endsWith(".spec.ts")
    || normalizedPath.endsWith(".spec.tsx")
    || normalizedPath === "package.json";
}

export function getEffectiveChangedFiles(paths: string[]) {
  const allChangedFiles = Array.from(new Set(paths.map((path) => path.replace(/\\/gu, "/"))));
  const packageJsonChanged = allChangedFiles.includes("package.json");
  const relevantChangedFiles = allChangedFiles.filter((path) => !isReleaseGeneratedArtifactPath(path, packageJsonChanged));
  const productFacingFiles = relevantChangedFiles.filter((path) => !isInternalReliabilityPath(path, packageJsonChanged));
  const internalReliabilityFiles = relevantChangedFiles.filter((path) => isInternalReliabilityPath(path, packageJsonChanged));

  return {
    allChangedFiles,
    relevantChangedFiles,
    productFacingFiles,
    internalReliabilityFiles,
    packageJsonChanged,
  };
}

export function affectedSurfacesFor(paths: string[]) {
  const surfaces = new Set<string>();
  for (const path of paths) {
    if (
      path.includes("Navbar")
      || path.includes("Navigation/")
      || path.includes("ReleaseNotes/")
      || path.includes("usePublicReleaseNotes")
      || path.includes("release-notes/")
    ) surfaces.add("navigation");
    if (path.includes("wallet") || path.includes("paypal")) surfaces.add("wallet");
    if (path.includes("chat") || path.includes("support")) surfaces.add("chat-support");
    if (path.includes("notification")) surfaces.add("notifications");
    if (path.includes("admin")) surfaces.add("admin");
    if (path.includes("creator")) surfaces.add("creator");
    if (path.includes("task") || path.includes("checkin")) surfaces.add("daily-tasks");
    if (path.includes("viewer") || path.includes("drop")) surfaces.add("drops-viewer");
    if (path.includes("auth") || path.includes("sign") || path.includes("onboarding") || path.includes("profile")) surfaces.add("account-onboarding");
    if (path.includes("security") || path.includes("privacy")) surfaces.add("privacy-security");
  }
  return surfaces.size > 0 ? Array.from(surfaces).sort() : ["app"];
}

export function resolveSurfaceCategory(surfaces: string[]): PublicReleaseSurfaceCategory {
  if (surfaces.includes("navigation")) return "Navigation";
  if (surfaces.includes("wallet")) return "Wallet";
  if (surfaces.includes("chat-support")) return "Chat & support";
  if (surfaces.includes("drops-viewer")) return "Drops & viewer";
  if (surfaces.includes("creator")) return "Creator tools";
  if (surfaces.includes("daily-tasks")) return "Daily tasks";
  if (surfaces.includes("notifications")) return "Notifications";
  if (surfaces.includes("privacy-security")) return "Privacy & security";
  if (surfaces.includes("account-onboarding")) return "Account & onboarding";
  if (surfaces.includes("admin")) return "Admin tools";
  if (surfaces.includes("app")) return "App experience";
  return "Internal reliability";
}

export function resolveAudience(titles: string[], surfaces: string[]): PublicReleaseAudience {
  const normalized = titles.join(" ").toLowerCase();
  if (surfaces.includes("navigation")) return "all";
  if (surfaces.includes("wallet") || surfaces.includes("chat-support") || surfaces.includes("notifications") || surfaces.includes("daily-tasks") || surfaces.includes("drops-viewer") || surfaces.includes("account-onboarding")) {
    return "users";
  }
  if (surfaces.includes("creator") || normalized.includes("creator")) return "creators";
  if (surfaces.includes("admin") || normalized.includes("admin") || normalized.includes("debug")) return "admins";
  return "all";
}

export function buildReleaseDescriptor(titles: string[], changedFiles: string[]): ReleaseDescriptor {
  const { productFacingFiles, internalReliabilityFiles } = getEffectiveChangedFiles(changedFiles);
  const affectedSurfaces = affectedSurfacesFor(productFacingFiles);
  const initialSurfaceCategory = resolveSurfaceCategory(affectedSurfaces);
  const audience = resolveAudience(titles, affectedSurfaces);
  const userFacing = productFacingFiles.length > 0 && (initialSurfaceCategory === "Navigation" || audience !== "admins");
  const hiddenFromPublic = !userFacing;

  return {
    titles,
    audience,
    affectedSurfaces,
    surfaceCategory: hiddenFromPublic ? (initialSurfaceCategory === "Admin tools" ? "Admin tools" : "Internal reliability") : initialSurfaceCategory,
    includesInternalReliability: internalReliabilityFiles.length > 0,
    hiddenFromPublic,
    userFacing,
  };
}

export function buildReleaseTitle(descriptor: ReleaseDescriptor) {
  const normalized = descriptor.titles.join(" ").toLowerCase();
  const isBetaUpdatesLane = descriptor.affectedSurfaces.includes("navigation")
    && /beta|release note|changelog|badge|drawer/u.test(normalized);

  if (!descriptor.userFacing) {
    if (descriptor.surfaceCategory === "Admin tools") return "Internal admin reliability improvements";
    return "Internal reliability improvements";
  }
  if (isBetaUpdatesLane) return "Improved Beta updates and version visibility";
  if (descriptor.surfaceCategory === "Navigation") return "Improved navigation reliability";
  if (descriptor.surfaceCategory === "Chat & support") return "Improved chat and support reliability";
  if (descriptor.surfaceCategory === "Wallet") return "Improved wallet reliability";
  if (descriptor.surfaceCategory === "Drops & viewer") return "Improved drops and viewer reliability";
  if (descriptor.surfaceCategory === "Notifications") return "Improved notification reliability";
  if (descriptor.surfaceCategory === "Daily tasks") return "Improved daily task reliability";
  if (descriptor.surfaceCategory === "Creator tools") return "Improved creator messaging and support tools";
  if (descriptor.surfaceCategory === "Account & onboarding") return "Improved sign-in and onboarding reliability";
  if (descriptor.surfaceCategory === "Privacy & security") return "Improved privacy and security reliability";
  return "Bug fixes and quality-of-life improvements";
}

export function buildReleaseSummary(descriptor: ReleaseDescriptor) {
  const normalized = descriptor.titles.join(" ").toLowerCase();
  const isBetaUpdatesLane = descriptor.affectedSurfaces.includes("navigation")
    && /beta|release note|changelog|badge|drawer/u.test(normalized);

  if (!descriptor.userFacing) {
    return descriptor.surfaceCategory === "Admin tools"
      ? "Internal reliability updates for admin-only tooling with no public app change."
      : "Internal reliability updates with no user-facing product changes.";
  }
  if (isBetaUpdatesLane) {
    return descriptor.includesInternalReliability
      ? "Bug fixes and quality-of-life improvements for Beta updates, version visibility, and behind-the-scenes release reliability."
      : "Bug fixes and quality-of-life improvements for Beta updates and version visibility.";
  }
  if (descriptor.surfaceCategory === "Navigation") return "Bug fixes and quality-of-life improvements for top-level navigation and Beta update access.";
  if (descriptor.surfaceCategory === "Chat & support") return "Bug fixes and quality-of-life improvements for chat and support.";
  if (descriptor.surfaceCategory === "Wallet") return "Bug fixes and quality-of-life improvements for wallet flows.";
  if (descriptor.surfaceCategory === "Drops & viewer") return "Bug fixes and quality-of-life improvements for drops, previews, and viewer behavior.";
  if (descriptor.surfaceCategory === "Notifications") return "Bug fixes and quality-of-life improvements for notifications.";
  if (descriptor.surfaceCategory === "Daily tasks") return "Bug fixes and quality-of-life improvements for daily tasks and check-ins.";
  if (descriptor.surfaceCategory === "Creator tools") return "Bug fixes and quality-of-life improvements for creator-facing experiences.";
  if (descriptor.surfaceCategory === "Account & onboarding") return "Bug fixes and quality-of-life improvements for sign-in and onboarding.";
  if (descriptor.surfaceCategory === "Privacy & security") return "Bug fixes and quality-of-life improvements for privacy and security.";
  return "Bug fixes and quality-of-life improvements.";
}

export function ensureBulletVerb(value: string) {
  const trimmed = value.trim().replace(/\.$/u, "");
  if (/^(Added|Clarified|Fixed|Improved|Reduced|Updated)\b/u.test(trimmed)) {
    return `${trimmed}.`;
  }
  return `Improved ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}.`;
}

export function buildReleaseBullets(descriptor: ReleaseDescriptor) {
  const normalized = descriptor.titles.join(" ").toLowerCase();
  const isBetaUpdatesLane = descriptor.affectedSurfaces.includes("navigation")
    && /beta|release note|changelog|badge|drawer/u.test(normalized);

  if (!descriptor.userFacing) {
    return [
      "Improved behind-the-scenes reliability for the current Beta build.",
      descriptor.surfaceCategory === "Admin tools"
        ? "Reduced internal admin tooling churn from appearing as a public app update."
        : "Reduced internal tooling noise so public update notes stay focused on product changes.",
    ];
  }

  if (isBetaUpdatesLane) {
    return [
      "Improved how the Beta drawer opens the latest accepted updates.",
      "Reduced stale or repeated release-note copy in the visible Beta feed.",
      descriptor.includesInternalReliability
        ? "Improved behind-the-scenes release tracking without flooding public notes with internal audit churn."
        : "Updated version visibility so the latest Beta notes stay easier to follow.",
    ];
  }

  if (descriptor.surfaceCategory === "Navigation") {
    return [
      "Improved how key app navigation surfaces stay in sync with the latest Beta build.",
      "Reduced confusing status changes when opening update notes and top-level navigation lanes.",
    ];
  }
  if (descriptor.surfaceCategory === "Chat & support") {
    return [
      "Improved chat and support reliability so common actions feel more stable.",
      "Reduced stuck or confusing states in active support and messaging flows.",
    ];
  }
  if (descriptor.surfaceCategory === "Wallet") {
    return [
      "Improved wallet flow reliability so purchase-ready surfaces stay clearer.",
      "Reduced confusing state changes around wallet-related interactions.",
    ];
  }
  if (descriptor.surfaceCategory === "Drops & viewer") {
    return [
      "Improved drop and viewer reliability so usage states stay easier to understand.",
      "Reduced confusing stale or delayed states across previews and viewer surfaces.",
    ];
  }
  if (descriptor.surfaceCategory === "Notifications") {
    return [
      "Improved notification reliability so important updates stay easier to follow.",
      "Reduced confusing states around seen, unseen, and delayed notification updates.",
    ];
  }
  if (descriptor.surfaceCategory === "Daily tasks") {
    return [
      "Improved daily task reliability so check-ins and task progress stay clearer.",
      "Reduced confusing refresh states around daily rewards and task completion.",
    ];
  }
  if (descriptor.surfaceCategory === "Creator tools") {
    return [
      "Improved creator-facing communication and support flows.",
      "Reduced confusing states around creator experience updates.",
    ];
  }
  if (descriptor.surfaceCategory === "Account & onboarding") {
    return [
      "Improved account entry points so common sign-in steps feel more stable.",
      "Reduced confusing onboarding states in the latest Beta build.",
    ];
  }
  if (descriptor.surfaceCategory === "Privacy & security") {
    return [
      "Improved privacy and security reliability behind the scenes.",
      "Reduced confusing trust and permission states in key app flows.",
    ];
  }

  return [
    "Fixed beta issues to make KandyDrops smoother to use.",
    "Improved reliability for the latest Beta build.",
  ];
}

export function buildTechnicalDetails(descriptor: ReleaseDescriptor, commitCount: number) {
  const details: string[] = [];

  if (commitCount > 1) {
    details.push(`Grouped ${commitCount} commits into one accepted beta release.`);
  }

  if (descriptor.includesInternalReliability) {
    details.push("Includes internal reliability work that does not change the public product surface.");
  }

  if (descriptor.titles.join(" ").toLowerCase().includes("unlock")) {
    details.push("Display language uses unwrap; backend entitlement fields may still use unlock.");
  }

  return details.length > 0 ? details : undefined;
}

export function classifyCategory(descriptor: ReleaseDescriptor): PublicReleaseNoteCategory {
  const normalized = descriptor.titles.join(" ").toLowerCase();
  if (normalized.includes("security")) return "Security";
  if (!descriptor.userFacing) return "Internal";
  if (descriptor.surfaceCategory === "Navigation") return "Beta";
  if (normalized.includes("feat(") || normalized.includes("feat:")) return "New";
  if (normalized.includes("perf(") || normalized.includes("perf:")) return "Improved";
  return "Fixed";
}
