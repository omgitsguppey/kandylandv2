export type RolloutKind = "feature" | "experiment";
export type RolloutAudience = "all" | "signed_in" | "signed_out" | "admin" | "member";
export type RolloutStage = "alpha" | "beta" | "ga";
export type RolloutSegment =
  | "guest"
  | "authenticated"
  | "member"
  | "creator"
  | "admin"
  | "surface_public"
  | "surface_dashboard"
  | "surface_experiences"
  | "surface_drops"
  | "surface_library"
  | "surface_profile"
  | "surface_admin";

export interface RolloutVariantDefinition {
  key: string;
  weight: number;
  label: string;
}

export interface RolloutDefinition {
  id: string;
  label: string;
  description: string;
  kind: RolloutKind;
  stage: RolloutStage;
  owner: string;
  enabled: boolean;
  audience: RolloutAudience;
  rolloutPercent: number;
  defaultVariant: string;
  variants: RolloutVariantDefinition[];
  requiredSegments?: RolloutSegment[];
  excludedSegments?: RolloutSegment[];
  killSwitchable?: boolean;
}

export interface RolloutIdentity {
  uid?: string | null;
  role?: "user" | "creator" | "admin" | null;
  sessionId?: string | null;
  subjectId?: string | null;
  path?: string | null;
}

export interface RolloutAssignment {
  id: string;
  label: string;
  description: string;
  kind: RolloutKind;
  stage: RolloutStage;
  owner: string;
  audience: RolloutAudience;
  active: boolean;
  eligible: boolean;
  variant: string;
  defaultVariant: string;
  rolloutPercent: number;
  killSwitchable: boolean;
  requiredSegments: RolloutSegment[];
  excludedSegments: RolloutSegment[];
  segments: RolloutSegment[];
  bucketId: string;
  reason: "assigned" | "holdout" | "disabled" | "ineligible";
}

export interface RolloutEvaluationSample {
  key: string;
  label: string;
  path: string;
  role: RolloutIdentity["role"];
  assignments: RolloutAssignment[];
}

export interface RolloutTelemetryContext {
  rollout_assignment_count: number;
  active_rollout_count: number;
  active_experiment_context?: string;
  active_feature_flag_context?: string;
  rollout_context?: string;
}

type RolloutOverrideMap = Record<string, Partial<Pick<RolloutDefinition, "enabled" | "rolloutPercent" | "defaultVariant" | "audience" | "variants" | "requiredSegments" | "excludedSegments">>>;

const DEFAULT_ROLLOUTS: RolloutDefinition[] = [
  {
    id: "dashboard_greeting_experiment",
    label: "Dashboard Greeting",
    description: "Stable dashboard greeting assignment for A/B-ready copy testing.",
    kind: "experiment",
    stage: "alpha",
    owner: "product",
    enabled: true,
    audience: "signed_in",
    rolloutPercent: 100,
    defaultVariant: "taste",
    requiredSegments: ["authenticated", "surface_dashboard"],
    killSwitchable: true,
    variants: [
      { key: "taste", weight: 34, label: "Taste" },
      { key: "missed", weight: 33, label: "Missed" },
      { key: "shop", weight: 33, label: "Shop" },
    ],
  },
  {
    id: "bug_report_entrypoint",
    label: "Bug Report Entry",
    description: "Controls the global bug-report affordance style for phased UX rollout.",
    kind: "experiment",
    stage: "alpha",
    owner: "product",
    enabled: true,
    audience: "signed_in",
    rolloutPercent: 100,
    defaultVariant: "icon",
    requiredSegments: ["authenticated"],
    excludedSegments: ["surface_admin"],
    killSwitchable: true,
    variants: [
      { key: "icon", weight: 55, label: "Icon" },
      { key: "pill", weight: 45, label: "Pill" },
    ],
  },
  {
    id: "bug_report_auto_context_v2",
    label: "Bug Auto Context",
    description: "Enables richer automatic diagnostics capture in bug reports.",
    kind: "feature",
    stage: "alpha",
    owner: "platform",
    enabled: true,
    audience: "signed_in",
    rolloutPercent: 100,
    defaultVariant: "control",
    requiredSegments: ["authenticated"],
    killSwitchable: true,
    variants: [
      { key: "enabled", weight: 100, label: "Enabled" },
    ],
  },
  {
    id: "admin_debug_mobile_density",
    label: "Admin Debug Mobile Density",
    description: "Enables compact mobile-friendly debug filters and denser admin diagnostics views.",
    kind: "feature",
    stage: "alpha",
    owner: "platform",
    enabled: true,
    audience: "admin",
    rolloutPercent: 100,
    defaultVariant: "control",
    requiredSegments: ["admin", "surface_admin"],
    killSwitchable: true,
    variants: [
      { key: "enabled", weight: 100, label: "Enabled" },
    ],
  },
];

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function hashToUnitInterval(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 10_000) / 10_000;
}

function parseRolloutOverrides() {
  const rawOverrides = process.env.NEXT_PUBLIC_ROLLOUT_OVERRIDES_JSON?.trim();
  if (!rawOverrides) {
    return {} as RolloutOverrideMap;
  }

  try {
    const parsed = JSON.parse(rawOverrides) as RolloutOverrideMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function mergeRolloutDefinitions() {
  const overrides = parseRolloutOverrides();

  return DEFAULT_ROLLOUTS.map((definition) => {
    const override = overrides[definition.id];
    if (!override) {
      return definition;
    }

    return {
      ...definition,
      ...override,
      rolloutPercent: clampPercent(Number(override.rolloutPercent ?? definition.rolloutPercent)),
      variants: Array.isArray(override.variants) && override.variants.length > 0
        ? override.variants.map((variant) => ({
            key: variant.key,
            weight: Number.isFinite(variant.weight) ? variant.weight : 0,
            label: variant.label,
          }))
        : definition.variants,
    } satisfies RolloutDefinition;
  });
}

function getIdentityKey(identity: RolloutIdentity) {
  if (identity.uid) {
    return `uid:${identity.uid}`;
  }

  if (identity.subjectId) {
    return `subject:${identity.subjectId}`;
  }

  if (identity.sessionId) {
    return `session:${identity.sessionId}`;
  }

  return "anonymous";
}

function isAudienceEligible(audience: RolloutAudience, identity: RolloutIdentity) {
  switch (audience) {
    case "all":
      return true;
    case "signed_in":
      return Boolean(identity.uid);
    case "signed_out":
      return !identity.uid;
    case "admin":
      return identity.role === "admin";
    case "member":
      return Boolean(identity.uid) && identity.role !== "admin";
    default:
      return false;
  }
}

function deriveRolloutSegments(identity: RolloutIdentity) {
  const segments = new Set<RolloutSegment>();
  const path = identity.path ?? "";

  if (identity.uid) {
    segments.add("authenticated");
  } else {
    segments.add("guest");
  }

  if (identity.role === "admin") {
    segments.add("admin");
  } else if (identity.role === "creator") {
    segments.add("creator");
    segments.add("member");
  } else if (identity.uid) {
    segments.add("member");
  }

  if (path.startsWith("/admin")) {
    segments.add("surface_admin");
  } else {
    segments.add("surface_public");
  }

  if (path.startsWith("/dashboard")) {
    segments.add("surface_dashboard");
    if (path.startsWith("/dashboard/library")) {
      segments.add("surface_library");
    }
    if (path.startsWith("/dashboard/profile")) {
      segments.add("surface_profile");
    }
  }

  if (path.startsWith("/drops")) {
    segments.add("surface_drops");
  }

  if (path.startsWith("/experiences")) {
    segments.add("surface_experiences");
  }

  return Array.from(segments.values());
}

function isSegmentEligible(definition: RolloutDefinition, segments: RolloutSegment[]) {
  const requiredSegments = definition.requiredSegments ?? [];
  const excludedSegments = definition.excludedSegments ?? [];

  if (requiredSegments.some((segment) => !segments.includes(segment))) {
    return false;
  }

  if (excludedSegments.some((segment) => segments.includes(segment))) {
    return false;
  }

  return true;
}

function selectVariant(definition: RolloutDefinition, identityKey: string) {
  const totalWeight = definition.variants.reduce((sum, variant) => sum + Math.max(0, variant.weight), 0);
  if (totalWeight <= 0) {
    return definition.defaultVariant;
  }

  const variantUnit = hashToUnitInterval(`${definition.id}:variant:${identityKey}`);
  let cursor = 0;

  for (const variant of definition.variants) {
    cursor += Math.max(0, variant.weight) / totalWeight;
    if (variantUnit <= cursor) {
      return variant.key;
    }
  }

  return definition.variants[definition.variants.length - 1]?.key || definition.defaultVariant;
}

export function getConfiguredRollouts() {
  return mergeRolloutDefinitions();
}

export function resolveRolloutAssignments(identity: RolloutIdentity) {
  const identityKey = getIdentityKey(identity);
  const segments = deriveRolloutSegments(identity);

  return getConfiguredRollouts().map((definition) => {
    const eligible = isAudienceEligible(definition.audience, identity) && isSegmentEligible(definition, segments);

    if (!definition.enabled) {
      return {
        id: definition.id,
        label: definition.label,
        description: definition.description,
        kind: definition.kind,
        stage: definition.stage,
        owner: definition.owner,
        audience: definition.audience,
        active: false,
        eligible,
        variant: definition.defaultVariant,
        defaultVariant: definition.defaultVariant,
        rolloutPercent: definition.rolloutPercent,
        killSwitchable: definition.killSwitchable !== false,
        requiredSegments: definition.requiredSegments ?? [],
        excludedSegments: definition.excludedSegments ?? [],
        segments,
        bucketId: identityKey,
        reason: "disabled",
      } satisfies RolloutAssignment;
    }

    if (!eligible) {
      return {
        id: definition.id,
        label: definition.label,
        description: definition.description,
        kind: definition.kind,
        stage: definition.stage,
        owner: definition.owner,
        audience: definition.audience,
        active: false,
        eligible,
        variant: definition.defaultVariant,
        defaultVariant: definition.defaultVariant,
        rolloutPercent: definition.rolloutPercent,
        killSwitchable: definition.killSwitchable !== false,
        requiredSegments: definition.requiredSegments ?? [],
        excludedSegments: definition.excludedSegments ?? [],
        segments,
        bucketId: identityKey,
        reason: "ineligible",
      } satisfies RolloutAssignment;
    }

    const rolloutUnit = hashToUnitInterval(`${definition.id}:rollout:${identityKey}`);
    const active = rolloutUnit * 100 < clampPercent(definition.rolloutPercent);

    return {
      id: definition.id,
      label: definition.label,
      description: definition.description,
      kind: definition.kind,
      stage: definition.stage,
      owner: definition.owner,
      audience: definition.audience,
      active,
      eligible,
      variant: active ? selectVariant(definition, identityKey) : definition.defaultVariant,
      defaultVariant: definition.defaultVariant,
      rolloutPercent: definition.rolloutPercent,
      killSwitchable: definition.killSwitchable !== false,
      requiredSegments: definition.requiredSegments ?? [],
      excludedSegments: definition.excludedSegments ?? [],
      segments,
      bucketId: identityKey,
      reason: active ? "assigned" : "holdout",
    } satisfies RolloutAssignment;
  });
}

export function buildRolloutTelemetryContext(assignments: RolloutAssignment[]): RolloutTelemetryContext {
  const activeAssignments = assignments.filter((assignment) => assignment.active);
  const activeExperiments = activeAssignments
    .filter((assignment) => assignment.kind === "experiment")
    .map((assignment) => `${assignment.id}:${assignment.variant}`)
    .slice(0, 8);
  const activeFeatures = activeAssignments
    .filter((assignment) => assignment.kind === "feature")
    .map((assignment) => `${assignment.id}:${assignment.variant}`)
    .slice(0, 8);
  const activeContexts = activeAssignments
    .map((assignment) => `${assignment.id}:${assignment.variant}`)
    .slice(0, 12);

  return {
    rollout_assignment_count: assignments.length,
    active_rollout_count: activeAssignments.length,
    ...(activeExperiments.length > 0 ? { active_experiment_context: activeExperiments.join(",") } : {}),
    ...(activeFeatures.length > 0 ? { active_feature_flag_context: activeFeatures.join(",") } : {}),
    ...(activeContexts.length > 0 ? { rollout_context: activeContexts.join(",") } : {}),
  };
}

export function getRolloutEvaluationSamples(): RolloutEvaluationSample[] {
  const samples: Array<Omit<RolloutEvaluationSample, "assignments"> & { identity: RolloutIdentity }> = [
    {
      key: "guest_public",
      label: "Guest on public surface",
      path: "/",
      role: null,
      identity: { uid: null, role: null, sessionId: "guest-session", subjectId: "guest-subject", path: "/" },
    },
    {
      key: "member_dashboard",
      label: "Member on dashboard",
      path: "/dashboard",
      role: "user",
      identity: { uid: "member-user", role: "user", sessionId: "member-session", subjectId: "member-subject", path: "/dashboard" },
    },
    {
      key: "creator_experiences",
      label: "Creator on experiences",
      path: "/experiences",
      role: "creator",
      identity: { uid: "creator-user", role: "creator", sessionId: "creator-session", subjectId: "creator-subject", path: "/experiences" },
    },
    {
      key: "admin_debug",
      label: "Admin in debug",
      path: "/admin/debug",
      role: "admin",
      identity: { uid: "admin-user", role: "admin", sessionId: "admin-session", subjectId: "admin-subject", path: "/admin/debug" },
    },
  ];

  return samples.map((sample) => ({
    key: sample.key,
    label: sample.label,
    path: sample.path,
    role: sample.role,
    assignments: resolveRolloutAssignments(sample.identity),
  }));
}
