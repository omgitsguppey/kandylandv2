import { NextRequest, NextResponse } from "next/server";

import {
  buildCreatorFanExperienceDebugPatch,
  formatCreatorFanExperienceSettingLabel,
  parseCreatorFanExperienceSettingsCommand,
  summarizeCreatorFanExperienceValue,
  validateCreatorFanExperienceSettingsCommand,
} from "@/lib/admin/creator-fan-experience-settings";
import { isCreatorOwnerEmail } from "@/lib/creator-admin";
import {
  actorMarkerToTelemetryPayload,
  assertKnownActor,
  buildAdminOnBehalfMarker,
  type ActorMarker,
} from "@/lib/identity/actor-markers";
import { handleApiError } from "@/lib/server/auth";
import {
  buildCreatorOnboardingHistoryEntry,
  CREATOR_ONBOARDING_COLLECTION,
  CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION,
  type CreatorOnboardingActor,
} from "@/lib/server/creator-onboarding";
import { adminDb } from "@/lib/server/firebase-admin";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { trackServerEvent } from "@/lib/server/analytics";
import { mapWithConcurrency } from "@/lib/server/bounded-concurrency";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const ADMIN_CREATOR_FAN_EXPERIENCE_BODY_LIMIT_BYTES = 64_000;
const ADMIN_CREATOR_FAN_EXPERIENCE_TELEMETRY_CONCURRENCY = 4;

function buildAdminActor(input: {
  uid?: string | null;
  email?: string | null;
  isOwner: boolean;
}) {
  return {
    uid: input.uid,
    email: input.email,
    role: input.isOwner ? "owner_admin" : "admin",
    isAdmin: true,
    isOwner: input.isOwner,
  };
}

function buildCreatorOnboardingActorFromMarker(marker: ActorMarker): CreatorOnboardingActor {
  return {
    id: marker.actorUid ?? marker.actorType,
    role: marker.actorType === "owner_admin" ? "owner_admin" : "admin",
    label: marker.actorEmail ?? marker.actorUid ?? "Admin",
    marker,
  };
}

function cleanRecord<T extends Record<string, unknown>>(record: T) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => stripUndefinedDeep(entry))
      .filter((entry) => entry !== undefined) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefinedDeep(entry)]),
    ) as T;
  }
  return value;
}

function buildSettingsHistoryEntry(input: {
  actor: CreatorOnboardingActor;
  marker: ActorMarker;
  timestamp: number;
  eventType: "creator_experience_settings_updated" | "creator_restrictions_updated";
  changedKeys: string[];
}) {
  const settingLabels = input.changedKeys.map(formatCreatorFanExperienceSettingLabel).join(", ");
  return {
    id: `${input.eventType}_${input.timestamp}`,
    entry: buildCreatorOnboardingHistoryEntry({
      eventType: input.eventType,
      actor: input.actor,
      timestamp: input.timestamp,
      summary: input.eventType === "creator_restrictions_updated"
        ? "Admin updated creator restrictions"
        : "Admin updated fan experience settings",
      detail: settingLabels ? `${settingLabels} changed.` : "Fan experience settings were saved.",
      metadata: cleanRecord({
        changedKeys: input.changedKeys,
        changedLabels: settingLabels,
      }),
    }),
  };
}

async function emitSettingsTelemetry(input: {
  marker: ActorMarker;
  targetUserId: string;
  settingChangedKeys: string[];
  restrictionChangedKeys: string[];
  currentSettings: Record<string, unknown>;
  nextSettings: Record<string, unknown>;
  currentRestrictions: Record<string, unknown>;
  nextRestrictions: Record<string, unknown>;
  warnings: string[];
}) {
  const basePayload = {
    page_path: "/admin/roster",
    admin_id: input.marker.actorUid ?? "",
    settingsValidationWarnings: input.warnings,
    changedKeys: [...input.settingChangedKeys, ...input.restrictionChangedKeys],
    ...actorMarkerToTelemetryPayload(input.marker),
  };

  await trackServerEvent("admin_creator_experience_settings_saved", {
    ...basePayload,
    settingKey: "fan_experience_settings",
    oldValue: "",
    newValue: [...input.settingChangedKeys, ...input.restrictionChangedKeys].join(","),
  }, input.targetUserId);

  const laneKeys = new Set(["messagingEnabled", "subscriptionsEnabled", "bookingsEnabled", "customRequestsEnabled", "broadcastsEnabled", "chatFreeForSubscribers"]);
  const pricingKeys = new Set(["subscriptionPriceGd", "phoneRatePerMinuteGd", "videoRatePerMinuteGd", "bookingMinimumMinutes", "videoSubscriberDiscountPercent"]);

  const telemetryTasks: Array<() => Promise<unknown>> = [
    ...input.settingChangedKeys.map((settingKey) => () => {
      const eventName = laneKeys.has(settingKey)
        ? "admin_creator_experience_lane_toggled"
        : pricingKeys.has(settingKey)
          ? "admin_creator_experience_pricing_updated"
          : "admin_creator_experience_settings_saved";
      return trackServerEvent(eventName, {
        ...basePayload,
        settingKey,
        oldValue: summarizeCreatorFanExperienceValue(input.currentSettings[settingKey]),
        newValue: summarizeCreatorFanExperienceValue(input.nextSettings[settingKey]),
      }, input.targetUserId);
    }),
    ...input.restrictionChangedKeys.map((settingKey) => () => trackServerEvent("admin_creator_experience_restriction_updated", {
      ...basePayload,
      settingKey,
      oldValue: summarizeCreatorFanExperienceValue(input.currentRestrictions[settingKey]),
      newValue: summarizeCreatorFanExperienceValue(input.nextRestrictions[settingKey]),
    }, input.targetUserId)),
  ];

  await mapWithConcurrency(
    telemetryTasks,
    ADMIN_CREATOR_FAN_EXPERIENCE_TELEMETRY_CONCURRENCY,
    async (task) => {
      await task();
    },
  );
}

async function POST_handler(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "admin/creator-fan-experience-settings",
      rateLimit: ADMIN,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const body = await readBoundedJsonBody<Record<string, unknown>>(request, {
      maxBytes: ADMIN_CREATOR_FAN_EXPERIENCE_BODY_LIMIT_BYTES,
      routeName: "admin/creator-fan-experience-settings",
      allowEmpty: false,
    });
    const parsed = parseCreatorFanExperienceSettingsCommand(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const command = parsed.command;
    const isOwnerActor = isCreatorOwnerEmail(caller?.email);
    const marker = assertKnownActor(buildAdminOnBehalfMarker(
      buildAdminActor({
        uid: caller?.uid,
        email: caller?.email,
        isOwner: isOwnerActor,
      }),
      command.targetUserId,
      {
        surface: "creator_experiences",
        route: "/admin/roster",
        actionKey: "admin_creator_experience_settings_saved",
        source: "admin_roster_fan_experience_settings",
        performedAs: "admin_on_behalf",
        targetCreatorId: command.targetUserId,
      },
    ));
    const actor = buildCreatorOnboardingActorFromMarker(marker);
    const nowMs = Date.now();
    const userRef = adminDb.collection("users").doc(command.targetUserId);
    // bounded document read: fan settings target one explicit creator/user id.
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return buildNotFoundResponse("user", "User not found");
    }

    const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};
    const validation = validateCreatorFanExperienceSettingsCommand({
      command,
      currentSettings: userData.creatorSettings as never,
      currentRestrictions: userData.creatorRestrictions as never,
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.errors[0] || "Fan experience settings are invalid." }, { status: 400 });
    }

    const debugPatch = buildCreatorFanExperienceDebugPatch({
      nowMs,
      actorUid: marker.actorUid,
      warnings: validation.warnings,
      changedKeys: validation.changedKeys,
    });
    const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(command.targetUserId);
    const historyRef = onboardingRef.collection(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION);

    await adminDb.runTransaction(async (transaction) => {
      const transactionUserSnap = await transaction.get(userRef);
      if (!transactionUserSnap.exists) {
        throw new Error("User not found");
      }

      transaction.set(userRef, stripUndefinedDeep(cleanRecord({
        creatorSettings: command.creatorSettings,
        creatorRestrictions: command.creatorRestrictions,
        creatorFanExperienceSettingsDebug: debugPatch,
        updatedAt: nowMs,
        updatedBy: marker.actorUid ?? "admin",
      })), { merge: true });
      transaction.set(onboardingRef, stripUndefinedDeep(cleanRecord({
        creatorFanExperienceSettingsDebug: debugPatch,
      })), { merge: true });
      transaction.set(adminDb.collection("creator_review_queue").doc(command.targetUserId), stripUndefinedDeep(cleanRecord({
        creatorFanExperienceSettingsDebug: debugPatch,
      })), { merge: true });

      if (validation.settingChangedKeys.length > 0) {
        const history = buildSettingsHistoryEntry({
          actor,
          marker,
          timestamp: nowMs,
          eventType: "creator_experience_settings_updated",
          changedKeys: validation.settingChangedKeys,
        });
        transaction.set(historyRef.doc(history.id), history.entry, { merge: true });
      }
      if (validation.restrictionChangedKeys.length > 0) {
        const history = buildSettingsHistoryEntry({
          actor,
          marker,
          timestamp: nowMs,
          eventType: "creator_restrictions_updated",
          changedKeys: validation.restrictionChangedKeys,
        });
        transaction.set(historyRef.doc(history.id), history.entry, { merge: true });
      }
    });

    await emitSettingsTelemetry({
      marker,
      targetUserId: command.targetUserId,
      settingChangedKeys: validation.settingChangedKeys,
      restrictionChangedKeys: validation.restrictionChangedKeys,
      currentSettings: (userData.creatorSettings as Record<string, unknown> | undefined) ?? {},
      nextSettings: command.creatorSettings as unknown as Record<string, unknown>,
      currentRestrictions: (userData.creatorRestrictions as Record<string, unknown> | undefined) ?? {},
      nextRestrictions: command.creatorRestrictions as unknown as Record<string, unknown>,
      warnings: validation.warnings,
    });

    return NextResponse.json({
      success: true,
      debug: debugPatch,
    });
  } catch (error) {
    if (isBoundedJsonBodyError(error)) {
      return NextResponse.json({
        success: false,
        code: error.code,
        error: error.message,
      }, { status: error.status });
    }
    if (error instanceof Error && error.message === "User not found") {
      return buildNotFoundResponse("user", "User not found");
    }
    return handleApiError(error, "Admin.CreatorFanExperienceSettings.POST");
  }
}

export let POST = withRouteRuntimeHealth("admin/creator-fan-experience-settings:POST", POST_handler);
