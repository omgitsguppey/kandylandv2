export const MOBILE_SCALE_CONTRACT_VERSION = "mobile-scale-v1-2026-05" as const;

export const MOBILE_UI_SURFACES = ["admin", "user", "creator", "public", "system"] as const;
export type MobileUiSurface = typeof MOBILE_UI_SURFACES[number];

export const DEVICE_BANDS = ["mobile", "tablet", "desktop"] as const;
export type DeviceBand = typeof DEVICE_BANDS[number];

export const MOBILE_DENSITIES = ["compact", "standard", "spacious"] as const;
export type MobileDensity = typeof MOBILE_DENSITIES[number];

export const MOBILE_MODULE_TYPES = [
  "overview",
  "manager",
  "form",
  "table",
  "list",
  "detail",
  "evidence",
  "debug",
] as const;
export type MobileModuleType = typeof MOBILE_MODULE_TYPES[number];

export type MobileSurfaceConfig = {
  surface: MobileUiSurface;
  moduleType: MobileModuleType;
  deviceBand: DeviceBand;
  className?: string;
  nestedScroll?: boolean;
  skeletonMatchesFinalLayout?: boolean;
};

export const MOBILE_SCALE_CONTRACT = {
  mobile: {
    maxHeaderPx: 30,
    maxCardPaddingPx: 16,
    maxCardMinHeightPx: {
      overview: 96,
      manager: 92,
      form: 112,
      table: 96,
      list: 72,
      detail: 112,
      evidence: 96,
      debug: 96,
    } satisfies Record<MobileModuleType, number>,
    maxGridColumns: {
      overview: 2,
      manager: 1,
      form: 1,
      table: 1,
      list: 1,
      detail: 1,
      evidence: 1,
      debug: 1,
    } satisfies Record<MobileModuleType, number>,
    touchTargetMinPx: 44,
    nestedScrollPolicy: "default_denied_except_list_table_debug_with_explicit_scroll_owner",
    skeletonSizingPolicy: "match_final_module_dimensions_to_prevent_layout_shift",
    hydrationPolicy: "content_first_then_idle_enhancement_no_duplicate_fetch",
    safeAreaPolicy: "consume shared shell safe-area tokens; this contract does not edit top nav, bottom nav, or chat",
  },
  tablet: {
    maxGridColumns: 3,
    densityExpansion: "standard_or_spacious_when_scanning_improves",
  },
  desktop: {
    maxGridColumns: 4,
    densityExpansion: "desktop_can_expand_without_backporting_sprawl_to_mobile",
  },
  protectedSurfaces: ["top_nav", "bottom_nav", "chat"] as const,
} as const;

const compactModules = new Set<MobileModuleType>(["overview", "manager", "table", "list", "evidence", "debug"]);

export function getMobileDensityForSurface(
  surface: MobileUiSurface,
  moduleType: MobileModuleType,
): MobileDensity {
  if (surface === "admin") return "compact";
  if (surface === "creator" && compactModules.has(moduleType)) return "compact";
  if (surface === "user" && (moduleType === "overview" || moduleType === "list")) return "compact";
  if (surface === "public" && moduleType === "overview") return "standard";
  return "standard";
}

export function getMobileModuleClassNames(
  surface: MobileUiSurface,
  moduleType: MobileModuleType,
): string {
  const density = getMobileDensityForSurface(surface, moduleType);
  const base = "w-full min-w-0 border border-white/10 bg-white/[0.04] text-white shadow-sm shadow-black/20";
  const radius = density === "compact" ? "rounded-[1.35rem]" : "rounded-[1.55rem]";
  const padding = density === "compact" ? "p-3" : "p-4";
  const gap = density === "compact" ? "gap-2" : "gap-3";
  const moduleMinHeight: Record<MobileModuleType, string> = {
    overview: "min-h-[5.5rem]",
    manager: "min-h-[4.5rem]",
    form: "min-h-[7rem]",
    table: "min-h-[5.5rem]",
    list: "min-h-[4.5rem]",
    detail: "min-h-[7rem]",
    evidence: "min-h-[5.5rem]",
    debug: "min-h-[5.5rem]",
  };

  return [base, radius, padding, gap, moduleMinHeight[moduleType]].join(" ");
}

export function getSkeletonClassForModule(moduleType: MobileModuleType): string {
  const minHeight: Record<MobileModuleType, string> = {
    overview: "min-h-[5.5rem]",
    manager: "min-h-[4.5rem]",
    form: "min-h-[7rem]",
    table: "min-h-[5.5rem]",
    list: "min-h-[4.5rem]",
    detail: "min-h-[7rem]",
    evidence: "min-h-[5.5rem]",
    debug: "min-h-[5.5rem]",
  };

  return [
    minHeight[moduleType],
    "w-full rounded-[1.35rem] border border-white/10 bg-white/[0.04]",
    "animate-pulse motion-reduce:animate-none",
  ].join(" ");
}

export function assertNoDesktopStuffing(config: MobileSurfaceConfig): { ok: boolean; failures: string[] } {
  const failures: string[] = [];
  const className = config.className ?? "";
  const isMobile = config.deviceBand === "mobile";

  if (!isMobile) return { ok: true, failures };
  if (/\bp-8\b/.test(className)) failures.push("mobile className must not use p-8 desktop padding");
  if (/\bpy-8\b|\bpx-8\b/.test(className)) failures.push("mobile className must not use py/px-8 desktop padding");
  if (/\btext-4xl\b|\btext-5xl\b/.test(className)) failures.push("mobile className must not use text-4xl display type");
  if (/\bh-screen\b|\bmin-h-screen\b/.test(className)) failures.push("mobile className must not use raw h-screen shell math");
  if (/\brounded-3xl\b/.test(className)) failures.push("mobile className should use shared radius tokens instead of rounded-3xl");

  const nestedScrollAllowed = config.moduleType === "list" || config.moduleType === "table" || config.moduleType === "debug";
  if (config.nestedScroll && !nestedScrollAllowed) {
    failures.push("mobile nested scroll requires an approved list/table/debug policy");
  }
  if (config.nestedScroll && !/overflow-y-auto|overflow-auto/.test(className)) {
    failures.push("mobile nested scroll must expose an explicit scroll owner");
  }
  if (config.skeletonMatchesFinalLayout === false) {
    failures.push("mobile skeletons must reserve roughly final layout size");
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}
