import {
  TASK_GUIDANCE_EVENT_NAMES,
  TASK_GUIDANCE_IMPLEMENTED,
  TASK_GUIDANCE_REQUIRED_IN_BETA,
  type TaskGuidanceEventName,
} from "@/lib/task-guidance";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";
import { getBehavioralActionAliasMap } from "@/lib/behavioral/normalize-event-fact";
import type { ConsentMode } from "@/lib/privacy/consent-tracking-policy";

export const TASK_GUIDANCE_VERSION = "task_guidance_v2";

export type TaskGuidanceMappingStatus = "mapped" | "missing";
export type TaskGuidanceBlockedReason =
  | "required_sample_missing"
  | "lifecycle_active_guidance_missing"
  | "source_ready_waiting_for_activity"
  | "not_required"
  | "not_implemented"
  | "none";

export type TaskGuidanceEmitter = {
  eventName: TaskGuidanceEventName;
  sourceComponent: "task_guidance_banner" | "daily_tasks_module";
  trigger: string;
  passiveRenderSafe: boolean;
};

export type TaskGuidanceTelemetryContract = {
  implemented: boolean;
  requiredInBeta: boolean;
  expectedEvents: TaskGuidanceEventName[];
  eventOwner: "retention";
  sourceComponent: string[];
  emitters: TaskGuidanceEmitter[];
  eventEnvelopeMapping: { status: TaskGuidanceMappingStatus; source: string };
  eventFactMapping: { status: TaskGuidanceMappingStatus; source: string };
  rollupMapping: { status: TaskGuidanceMappingStatus; fields: string[] };
  adminValidationConsumer: { status: TaskGuidanceMappingStatus; checkKey: "task_guidance_parity" };
  consentPolicy: { status: TaskGuidanceMappingStatus; minimalAnalyticsAllowed: boolean };
  sampleRequirement: { required: boolean; minimumSamples: number };
  passPolicy: { sampleCanPassWithZero: boolean; reason: string };
  blockedReason: TaskGuidanceBlockedReason;
  nextAction: string;
};

const EXPECTED_GUIDANCE_EVENTS = [...TASK_GUIDANCE_EVENT_NAMES];
const ROLLUP_FIELDS = [
  "guidanceViews",
  "guidanceTaps",
  "guidanceDismissals",
  "guidanceCompletions",
  "taskCardExpansions",
  "taskHelpOpens",
] as const;

const TASK_GUIDANCE_EMITTERS: TaskGuidanceEmitter[] = [
  {
    eventName: "task_guidance_viewed",
    sourceComponent: "task_guidance_banner",
    trigger: "banner visible once per active guidance key",
    passiveRenderSafe: true,
  },
  {
    eventName: "task_guidance_viewed",
    sourceComponent: "daily_tasks_module",
    trigger: "task details expanded",
    passiveRenderSafe: true,
  },
  {
    eventName: "task_guidance_tapped",
    sourceComponent: "task_guidance_banner",
    trigger: "banner CTA tapped",
    passiveRenderSafe: true,
  },
  {
    eventName: "task_guidance_tapped",
    sourceComponent: "daily_tasks_module",
    trigger: "task action tapped from guidance details",
    passiveRenderSafe: true,
  },
  {
    eventName: "task_guidance_dismissed",
    sourceComponent: "task_guidance_banner",
    trigger: "banner dismissed by button or swipe",
    passiveRenderSafe: true,
  },
  {
    eventName: "task_guidance_completed",
    sourceComponent: "task_guidance_banner",
    trigger: "existing task completion observed after guidance activation",
    passiveRenderSafe: true,
  },
  {
    eventName: "task_card_expanded",
    sourceComponent: "daily_tasks_module",
    trigger: "task card expanded",
    passiveRenderSafe: true,
  },
  {
    eventName: "task_help_opened",
    sourceComponent: "daily_tasks_module",
    trigger: "task help text revealed",
    passiveRenderSafe: true,
  },
];

function telemetryCatalogHasAllEvents() {
  const eventNames = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
  return EXPECTED_GUIDANCE_EVENTS.every((eventName) => eventNames.has(eventName));
}

function factNormalizerHasAllEvents() {
  const aliases = getBehavioralActionAliasMap();
  return EXPECTED_GUIDANCE_EVENTS.every((eventName) => aliases[eventName]);
}

export function buildTaskGuidanceTelemetryPayload(input: {
  eventName: TaskGuidanceEventName;
  taskId: string;
  taskKind: string;
  sourceComponent: string;
  route: string;
  userId?: string | null;
  sessionId?: string | null;
  consentMode?: ConsentMode | "unknown";
  guidanceVersion?: string;
  dailyTaskWindowId?: string | null;
  assignmentSource?: string | null;
  actionType?: string | null;
  taskTitle?: string | null;
  rewardGd?: number | null;
}) {
  return {
    task_id: input.taskId,
    taskId: input.taskId,
    task_kind: input.taskKind,
    taskKind: input.taskKind,
    source_component: input.sourceComponent,
    sourceComponent: input.sourceComponent,
    route: input.route,
    user_id: input.userId ?? undefined,
    session_id: input.sessionId ?? undefined,
    consent_mode: input.consentMode ?? "unknown",
    guidance_version: input.guidanceVersion ?? TASK_GUIDANCE_VERSION,
    daily_task_window_id: input.dailyTaskWindowId ?? undefined,
    assignment_source: input.assignmentSource ?? undefined,
    action_type: input.actionType ?? undefined,
    task_title: input.taskTitle ?? undefined,
    reward_gd: typeof input.rewardGd === "number" ? input.rewardGd : undefined,
    sourceTruth: "client_supporting",
  };
}

export function shouldEmitTaskGuidanceViewed(input: {
  seenKeys: Set<string>;
  visible: boolean;
  loading: boolean;
  taskId: string;
  assignedAt?: number | null;
  guidanceVersion?: string;
}) {
  if (!input.visible || input.loading || !input.taskId) {
    return false;
  }

  const key = [
    input.guidanceVersion ?? TASK_GUIDANCE_VERSION,
    input.taskId,
    input.assignedAt ?? 0,
  ].join(":");
  if (input.seenKeys.has(key)) {
    return false;
  }
  input.seenKeys.add(key);
  return true;
}

export function buildTaskGuidanceTelemetryContract(input: {
  lifecycleSampleCount?: number;
  guidanceSampleCount?: number;
  implemented?: boolean;
  requiredInBeta?: boolean;
} = {}): TaskGuidanceTelemetryContract {
  const implemented = input.implemented ?? TASK_GUIDANCE_IMPLEMENTED;
  const requiredInBeta = input.requiredInBeta ?? TASK_GUIDANCE_REQUIRED_IN_BETA;
  const lifecycleSampleCount = Math.max(0, input.lifecycleSampleCount ?? 0);
  const guidanceSampleCount = Math.max(0, input.guidanceSampleCount ?? 0);
  const catalogMapped = telemetryCatalogHasAllEvents();
  const factMapped = factNormalizerHasAllEvents();
  const allEmittersPresent = EXPECTED_GUIDANCE_EVENTS.every((eventName) => (
    TASK_GUIDANCE_EMITTERS.some((emitter) => emitter.eventName === eventName)
  ));
  const sourceReady = implemented && requiredInBeta && catalogMapped && factMapped && allEmittersPresent;
  const zeroSamplesBlocked = requiredInBeta && guidanceSampleCount === 0;
  const blockedReason: TaskGuidanceBlockedReason = !implemented
    ? "not_implemented"
    : !requiredInBeta
      ? "not_required"
      : zeroSamplesBlocked && lifecycleSampleCount > 0
        ? "lifecycle_active_guidance_missing"
        : zeroSamplesBlocked && sourceReady
          ? "source_ready_waiting_for_activity"
          : zeroSamplesBlocked
            ? "required_sample_missing"
            : "none";

  return {
    implemented,
    requiredInBeta,
    expectedEvents: [...EXPECTED_GUIDANCE_EVENTS],
    eventOwner: "retention",
    sourceComponent: ["task_guidance_banner", "daily_tasks_module"],
    emitters: [...TASK_GUIDANCE_EMITTERS],
    eventEnvelopeMapping: {
      status: catalogMapped ? "mapped" : "missing",
      source: "src/lib/analytics/event-envelope-builder.ts",
    },
    eventFactMapping: {
      status: factMapped ? "mapped" : "missing",
      source: "src/lib/behavioral/normalize-event-fact.ts",
    },
    rollupMapping: {
      status: "mapped",
      fields: [...ROLLUP_FIELDS],
    },
    adminValidationConsumer: {
      status: "mapped",
      checkKey: "task_guidance_parity",
    },
    consentPolicy: {
      status: "mapped",
      minimalAnalyticsAllowed: true,
    },
    sampleRequirement: {
      required: implemented && requiredInBeta,
      minimumSamples: implemented && requiredInBeta ? 1 : 0,
    },
    passPolicy: {
      sampleCanPassWithZero: false,
      reason: "Required task guidance telemetry cannot pass with zero samples unless the beta requirement is changed.",
    },
    blockedReason,
    nextAction: blockedReason === "lifecycle_active_guidance_missing"
      ? "Fix task guidance UI emitters and rollups, then wait for real guidance activity before promoting parity."
      : blockedReason === "source_ready_waiting_for_activity"
        ? "Source is ready; keep parity blocked until real task guidance activity arrives."
        : blockedReason === "none"
          ? "No action required."
          : "Repair task guidance telemetry mapping before promoting parity.",
  };
}
