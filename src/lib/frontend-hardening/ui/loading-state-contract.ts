import {
  getSkeletonClassForModule,
  type MobileModuleType,
  type MobileUiSurface,
} from "@/lib/frontend-hardening/ui/mobile-scale-contract";

export type ModuleLoadingState = "idle" | "loading" | "refreshing" | "loaded" | "empty" | "error";

export type ModuleLoadingStateInput = {
  loading?: boolean;
  hasData?: boolean;
  error?: unknown;
};

export type StaleRequestGuard = {
  next: () => number;
  current: () => number;
  isFresh: (requestId: number) => boolean;
};

export function createStaleRequestGuard(initialRequestId = 0): StaleRequestGuard {
  let currentRequestId = initialRequestId;

  return {
    next() {
      currentRequestId += 1;
      return currentRequestId;
    },
    current() {
      return currentRequestId;
    },
    isFresh(requestId: number) {
      return requestId === currentRequestId;
    },
  };
}

export function isFreshRequest(currentRequestId: number, requestId: number) {
  return currentRequestId === requestId;
}

export function getMobileSkeletonClass(
  surface: MobileUiSurface,
  moduleType: MobileModuleType,
  extraClassName = "",
) {
  const surfaceTone = surface === "admin"
    ? "border-white/10 bg-white/[0.04]"
    : surface === "creator"
      ? "border-white/10 bg-black/25"
      : "border-white/10 bg-white/[0.035]";

  return [
    getSkeletonClassForModule(moduleType),
    surfaceTone,
    "motion-reduce:animate-none",
    extraClassName,
  ].filter(Boolean).join(" ");
}

export function getModuleLoadingState(input: ModuleLoadingStateInput): ModuleLoadingState {
  if (input.error) return "error";
  if (input.loading && input.hasData) return "refreshing";
  if (input.loading) return "loading";
  if (input.hasData) return "loaded";
  return "empty";
}

export function shouldShowCompactSkeleton(input: ModuleLoadingStateInput) {
  const state = getModuleLoadingState(input);
  return state === "loading" || state === "refreshing";
}
