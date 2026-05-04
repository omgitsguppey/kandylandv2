import {
  BEHAVIORAL_NORMALIZED_ACTIONS,
  type BehavioralEventFact,
} from "@/lib/behavioral/event-fact-contract";
import {
  dedupeBehavioralEventFacts,
  describeBehavioralAction,
  getBehavioralActionAliasMap,
  normalizeBehavioralEventFact,
} from "@/lib/behavioral/normalize-event-fact";

export const USER_ACTION_NAMES = BEHAVIORAL_NORMALIZED_ACTIONS;

export type UserActionName = typeof USER_ACTION_NAMES[number];

export type UserActionEntityType = NonNullable<BehavioralEventFact["entityType"]> | "unknown";

export type NormalizedUserAction = {
  actionName: UserActionName;
  actionId: string;
  timestamp: number;
  userId: string;
  sessionId: string;
  sourceComponent: string;
  route: string;
  entityId: string | null;
  entityType: UserActionEntityType;
  rawEventName: string;
};

export type UserActionLedgerItem = NormalizedUserAction & {
  label: string;
};

function toLegacyAction(fact: BehavioralEventFact): NormalizedUserAction {
  return {
    actionName: fact.normalizedAction,
    actionId: fact.dedupeKey,
    timestamp: fact.timestampMs,
    userId: fact.userId || "anonymous",
    sessionId: fact.sessionId || "unknown_session",
    sourceComponent: fact.sourceComponent,
    route: fact.route,
    entityId: fact.entityId || null,
    entityType: fact.entityType || "unknown",
    rawEventName: fact.rawEventName,
  };
}

export function describeUserActionName(actionName: UserActionName) {
  return describeBehavioralAction(actionName);
}

export function getUserActionAliasMap() {
  return getBehavioralActionAliasMap();
}

export function normalizeUserAction(input: {
  eventId?: unknown;
  eventName?: unknown;
  params?: Record<string, unknown> | null;
  timestamp?: unknown;
  userId?: unknown;
  sessionId?: unknown;
  pagePath?: unknown;
  route?: unknown;
  dropId?: unknown;
  creatorId?: unknown;
  assetKey?: unknown;
  assetIndex?: unknown;
}): NormalizedUserAction | null {
  const fact = normalizeBehavioralEventFact({
    ...input,
    source: "server",
  });
  return fact ? toLegacyAction(fact) : null;
}

export function dedupeNormalizedUserActions(actions: Array<NormalizedUserAction | null | undefined>) {
  const facts = actions.map((action) => {
    if (!action) return null;
    return {
      eventId: action.actionId,
      userId: action.userId,
      sessionId: action.sessionId,
      eventName: action.rawEventName,
      rawEventName: action.rawEventName,
      normalizedAction: action.actionName,
      timestampMs: action.timestamp,
      route: action.route,
      pagePath: action.route,
      sourceComponent: action.sourceComponent,
      ...(action.entityId ? { entityId: action.entityId } : {}),
      ...(action.entityType !== "unknown" ? { entityType: action.entityType } : {}),
      source: "server" as const,
      sourceTruth: "server" as const,
      confidence: 1,
      dedupeKey: action.actionId,
    } satisfies BehavioralEventFact;
  });

  return dedupeBehavioralEventFacts(facts).map(toLegacyAction);
}

export function toUserActionLedgerItem(action: NormalizedUserAction): UserActionLedgerItem {
  return {
    ...action,
    label: describeUserActionName(action.actionName),
  };
}
