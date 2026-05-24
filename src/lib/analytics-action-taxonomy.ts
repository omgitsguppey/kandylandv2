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
    return normalizeBehavioralEventFact({
      eventId: action.actionId,
      eventName: action.rawEventName,
      timestamp: action.timestamp,
      userId: action.userId,
      sessionId: action.sessionId,
      route: action.route,
      pagePath: action.route,
      params: {
        sourceComponent: action.sourceComponent,
        route: action.route,
        ...(action.entityId ? { entityId: action.entityId } : {}),
      },
      source: "server",
      confidence: 1,
    });
  });

  return dedupeBehavioralEventFacts(facts).map(toLegacyAction);
}

export function toUserActionLedgerItem(action: NormalizedUserAction): UserActionLedgerItem {
  return {
    ...action,
    label: describeUserActionName(action.actionName),
  };
}
