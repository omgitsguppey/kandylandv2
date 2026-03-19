export type RolloutKind = "feature" | "experiment";
export type RolloutAudience = "all" | "signed_in" | "signed_out" | "admin" | "member";

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
  enabled: boolean;
  audience: RolloutAudience;
  rolloutPercent: number;
  defaultVariant: string;
  variants: RolloutVariantDefinition[];
}

export interface RolloutIdentity {
  uid?: string | null;
  role?: "user" | "creator" | "admin" | null;
  sessionId?: string | null;
  subjectId?: string | null;
}

export interface RolloutAssignment {
  id: string;
  label: string;
  description: string;
  kind: RolloutKind;
  audience: RolloutAudience;
  active: boolean;
  eligible: boolean;
  variant: string;
  defaultVariant: string;
  rolloutPercent: number;
  reason: "assigned" | "holdout" | "disabled" | "ineligible";
}

type RolloutOverrideMap = Record<string, Partial<Pick<RolloutDefinition, "enabled" | "rolloutPercent" | "defaultVariant" | "audience" | "variants">>>;

const DEFAULT_ROLLOUTS: RolloutDefinition[] = [
  {
    id: "dashboard_greeting_experiment",
    label: "Dashboard Greeting",
    description: "Stable dashboard greeting assignment for A/B-ready copy testing.",
    kind: "experiment",
    enabled: true,
    audience: "signed_in",
    rolloutPercent: 100,
    defaultVariant: "taste",
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
    enabled: true,
    audience: "signed_in",
    rolloutPercent: 100,
    defaultVariant: "icon",
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
    enabled: true,
    audience: "signed_in",
    rolloutPercent: 100,
    defaultVariant: "control",
    variants: [
      { key: "enabled", weight: 100, label: "Enabled" },
    ],
  },
  {
    id: "admin_debug_mobile_density",
    label: "Admin Debug Mobile Density",
    description: "Enables compact mobile-friendly debug filters and denser admin diagnostics views.",
    kind: "feature",
    enabled: true,
    audience: "admin",
    rolloutPercent: 100,
    defaultVariant: "control",
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

  return getConfiguredRollouts().map((definition) => {
    const eligible = isAudienceEligible(definition.audience, identity);

    if (!definition.enabled) {
      return {
        id: definition.id,
        label: definition.label,
        description: definition.description,
        kind: definition.kind,
        audience: definition.audience,
        active: false,
        eligible,
        variant: definition.defaultVariant,
        defaultVariant: definition.defaultVariant,
        rolloutPercent: definition.rolloutPercent,
        reason: "disabled",
      } satisfies RolloutAssignment;
    }

    if (!eligible) {
      return {
        id: definition.id,
        label: definition.label,
        description: definition.description,
        kind: definition.kind,
        audience: definition.audience,
        active: false,
        eligible,
        variant: definition.defaultVariant,
        defaultVariant: definition.defaultVariant,
        rolloutPercent: definition.rolloutPercent,
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
      audience: definition.audience,
      active,
      eligible,
      variant: active ? selectVariant(definition, identityKey) : definition.defaultVariant,
      defaultVariant: definition.defaultVariant,
      rolloutPercent: definition.rolloutPercent,
      reason: active ? "assigned" : "holdout",
    } satisfies RolloutAssignment;
  });
}
