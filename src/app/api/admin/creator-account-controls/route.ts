import { NextRequest, NextResponse } from "next/server";

import {
  buildCreatorOnboardingCanonicalRecord,
  normalizeCreatorOnboardingCanonicalRecord,
  type CreatorOnboardingHistoryEntry,
} from "@/lib/creator-onboarding";
import {
  creatorAccountActionField,
  isDangerousCreatorAccountAction,
  parseCreatorAccountControlCommand,
  redactAccountControlValue,
  type CreatorAccountControlAction,
  type CreatorAccountControlCommand,
} from "@/lib/admin/creator-account-controls";
import { isCreatorOwnerEmail } from "@/lib/creator-admin";
import {
  actorMarkerToTelemetryPayload,
  assertKnownActor,
  buildActorMarkerDebugFields,
  buildAdminOnBehalfMarker,
  type ActorMarker,
} from "@/lib/identity/actor-markers";
import { handleApiError } from "@/lib/server/auth";
import {
  CREATOR_ONBOARDING_COLLECTION,
  CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION,
  buildCreatorOnboardingStatusChangeHistoryEntries,
  recordCreatorOnboardingHistoryEntries,
  shouldActivateCreatorRole,
  syncCreatorOnboardingDocuments,
  type CreatorOnboardingActor,
} from "@/lib/server/creator-onboarding";
import { adminAuth, adminDb } from "@/lib/server/firebase-admin";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { trackServerEvent } from "@/lib/server/analytics";
import { reserveUsernameForUser } from "@/lib/server/username-suggestions";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

type UserRole = "user" | "creator" | "admin";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readRole(value: unknown): UserRole {
  return value === "creator" || value === "admin" || value === "user" ? value : "user";
}

function toTimestampNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    value
    && typeof value === "object"
    && "toMillis" in value
    && typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  return 0;
}

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

function buildAccountDebugPatch(input: {
  nowMs: number;
  actorUid?: string;
  warnings: string[];
  passwordActionMode?: string;
  emailUpdateServerConfirmed?: boolean;
  roleUpdateServerConfirmed?: boolean;
}) {
  return {
    lastAdminAccountActionAt: input.nowMs,
    lastAdminAccountActionBy: input.actorUid ?? "admin",
    accountControlWarnings: input.warnings,
    passwordActionMode: input.passwordActionMode ?? "none",
    emailUpdateServerConfirmed: input.emailUpdateServerConfirmed ?? false,
    roleUpdateServerConfirmed: input.roleUpdateServerConfirmed ?? false,
  };
}

function buildAccountHistoryEntry(input: {
  action: CreatorAccountControlAction;
  actor: CreatorOnboardingActor;
  marker: ActorMarker;
  timestamp: number;
  fieldChanged: string;
  oldValueRedacted: string;
  newValueRedacted: string;
  warnings: string[];
}) {
  return {
    id: `admin_account_updated_${input.fieldChanged}_${input.timestamp}`,
    entry: {
      eventType: "admin_account_updated",
      actorId: input.actor.id,
      actorRole: input.actor.role,
      actorLabel: input.actor.label,
      timestamp: input.timestamp,
      summary: "Admin updated creator account controls",
      detail: `${input.fieldChanged} changed from ${input.oldValueRedacted || "not set"} to ${input.newValueRedacted || "not set"}.`,
      metadata: cleanRecord({
        actionKey: input.action,
        fieldChanged: input.fieldChanged,
        oldValueRedacted: input.oldValueRedacted,
        newValueRedacted: input.newValueRedacted,
        accountControlWarnings: input.warnings,
        ...buildActorMarkerDebugFields(input.marker),
      }),
    } satisfies CreatorOnboardingHistoryEntry,
  };
}

async function emitAccountControlTelemetry(input: {
  action: CreatorAccountControlAction;
  marker: ActorMarker;
  targetUserId: string;
  fieldChanged: string;
  oldValueRedacted: string;
  newValueRedacted: string;
  warnings: string[];
  passwordActionMode?: string;
  emailUpdateServerConfirmed?: boolean;
  roleUpdateServerConfirmed?: boolean;
}) {
  const payload = {
    page_path: "/admin/roster",
    admin_id: input.marker.actorUid ?? "",
    fieldChanged: input.fieldChanged,
    oldValueRedacted: input.oldValueRedacted,
    newValueRedacted: input.newValueRedacted,
    accountControlWarnings: input.warnings,
    passwordActionMode: input.passwordActionMode ?? "none",
    emailUpdateServerConfirmed: input.emailUpdateServerConfirmed === true,
    roleUpdateServerConfirmed: input.roleUpdateServerConfirmed === true,
    ...actorMarkerToTelemetryPayload(input.marker),
  };

  switch (input.action) {
    case "update_email":
      return trackServerEvent("admin_creator_email_updated", payload, input.targetUserId);
    case "create_password_reset_link":
      return trackServerEvent("admin_creator_password_reset_sent", payload, input.targetUserId);
    case "set_temporary_password":
      return trackServerEvent("admin_creator_temporary_password_set", payload, input.targetUserId);
    case "update_role":
      return trackServerEvent("admin_creator_role_updated", payload, input.targetUserId);
    case "update_status":
      return trackServerEvent("admin_creator_status_updated", payload, input.targetUserId);
    default:
      return trackServerEvent("admin_creator_account_updated", payload, input.targetUserId);
  }
}

async function writeAccountAudit(input: {
  command: CreatorAccountControlCommand;
  actor: CreatorOnboardingActor;
  marker: ActorMarker;
  fieldChanged: string;
  oldValueRedacted: string;
  newValueRedacted: string;
  warnings: string[];
  debugPatch: ReturnType<typeof buildAccountDebugPatch>;
  userPatch?: Record<string, unknown>;
  queuePatch?: Record<string, unknown>;
  onboardingPatch?: Record<string, unknown>;
}) {
  const userRef = adminDb.collection("users").doc(input.command.targetUserId);
  const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(input.command.targetUserId);
  const historyRef = onboardingRef.collection(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION)
    .doc(`admin_account_updated_${input.fieldChanged}_${input.debugPatch.lastAdminAccountActionAt}`);

  await adminDb.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) {
      throw new Error("User not found");
    }

    transaction.set(userRef, cleanRecord({
      ...(input.userPatch ?? {}),
      adminAccountControlDebug: input.debugPatch,
      updatedAt: input.debugPatch.lastAdminAccountActionAt,
      updatedBy: input.debugPatch.lastAdminAccountActionBy,
    }), { merge: true });

    transaction.set(onboardingRef, cleanRecord({
      ...(input.onboardingPatch ?? {}),
      ...input.debugPatch,
    }), { merge: true });

    transaction.set(
      adminDb.collection("creator_review_queue").doc(input.command.targetUserId),
      cleanRecord({
        ...(input.queuePatch ?? {}),
        ...input.debugPatch,
      }),
      { merge: true },
    );

    transaction.set(historyRef, buildAccountHistoryEntry({
      action: input.command.action,
      actor: input.actor,
      marker: input.marker,
      timestamp: input.debugPatch.lastAdminAccountActionAt,
      fieldChanged: input.fieldChanged,
      oldValueRedacted: input.oldValueRedacted,
      newValueRedacted: input.newValueRedacted,
      warnings: input.warnings,
    }).entry, { merge: true });
  });
}

async function updateRole(input: {
  command: Extract<CreatorAccountControlCommand, { action: "update_role" }>;
  actor: CreatorOnboardingActor;
  marker: ActorMarker;
  isOwnerActor: boolean;
  nowMs: number;
}) {
  if (input.command.role === "admin" && !input.isOwnerActor) {
    return NextResponse.json({
      error: "Only the owner admin can grant admin access.",
    }, { status: 403 });
  }

  const userRef = adminDb.collection("users").doc(input.command.targetUserId);
  const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(input.command.targetUserId);
  const debugPatch = buildAccountDebugPatch({
    nowMs: input.nowMs,
    actorUid: input.marker.actorUid,
    warnings: [],
    roleUpdateServerConfirmed: true,
  });
  let oldRole: UserRole = "user";
  let blockedRoleActivation: Record<string, unknown> | null = null;

  const roleUpdateApplied = await adminDb.runTransaction(async (transaction) => {
    const [userSnap, onboardingSnap] = await transaction.getAll(userRef, onboardingRef);
    if (!userSnap.exists) {
      throw new Error("User not found");
    }

    const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};
    oldRole = readRole(userData.role);
    const currentCanonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());

    if (input.command.role === "creator") {
      if (!currentCanonical) {
        throw new Error("Creator role requires a creator onboarding record.");
      }

      if (oldRole !== "creator" && !shouldActivateCreatorRole(currentCanonical)) {
        blockedRoleActivation = {
          targetUserId: input.command.targetUserId,
          currentRole: oldRole,
          requestedRole: input.command.role,
          approvalStatus: currentCanonical.approvalStatus,
          legalStatus: currentCanonical.legalStatus,
          idVerificationStatus: currentCanonical.idVerificationStatus,
          contractDocumentStatus: currentCanonical.contractDocumentStatus,
          creatorSignatureStatus: currentCanonical.creatorSignatureStatus,
          adminSignatureStatus: currentCanonical.adminSignatureStatus,
        };
        recordCreatorOnboardingHistoryEntries(transaction, input.command.targetUserId, [{
          id: `creator_role_activation_blocked_${input.nowMs}`,
          entry: {
            eventType: "creator_role_activation_blocked",
            actorId: input.actor.id,
            actorRole: input.actor.role,
            actorLabel: input.actor.label,
            timestamp: input.nowMs,
            summary: "Creator role activation blocked",
            detail: "Creator role requires intro, ID, and agreement completion before activation.",
            metadata: buildActorMarkerDebugFields(input.marker),
          },
        }]);
        return false;
      }
    }

    transaction.set(userRef, {
      role: input.command.role,
      creator: input.command.role === "creator",
      adminAccountControlDebug: debugPatch,
      updatedAt: input.nowMs,
      updatedBy: input.marker.actorUid ?? "admin",
    }, { merge: true });

    if (currentCanonical) {
      const nextCanonical = buildCreatorOnboardingCanonicalRecord({
        userId: input.command.targetUserId,
        email: typeof userData.email === "string" ? userData.email : currentCanonical.email,
        username: typeof userData.username === "string" ? userData.username : currentCanonical.username,
        displayName: typeof userData.displayName === "string" ? userData.displayName : currentCanonical.creatorDisplayName,
        photoURL: typeof userData.photoURL === "string" ? userData.photoURL : currentCanonical.photoURL,
        role: input.command.role,
        createdAt: currentCanonical.createdAt || toTimestampNumber(userData.createdAt) || input.nowMs,
        queuePosition: currentCanonical.queuePosition,
        creatorDisplayName: currentCanonical.creatorDisplayName,
        creatorPrimaryPlatform: currentCanonical.creatorPrimaryPlatform,
        creatorContentFocus: currentCanonical.creatorContentFocus,
        nowMs: input.nowMs,
        source: {
          ...currentCanonical,
          role: input.command.role,
          lastAdminActionAt: input.nowMs,
          lastAdminActionBy: input.marker.actorUid ?? "admin",
          ...debugPatch,
        },
      });

      syncCreatorOnboardingDocuments(transaction, {
        userId: input.command.targetUserId,
        displayName: typeof userData.displayName === "string" ? userData.displayName : currentCanonical.creatorDisplayName,
        canonical: nextCanonical,
      });

      recordCreatorOnboardingHistoryEntries(transaction, input.command.targetUserId, [
        ...buildCreatorOnboardingStatusChangeHistoryEntries({
          before: currentCanonical,
          after: nextCanonical,
          actor: input.actor,
          timestamp: input.nowMs,
        }),
        buildAccountHistoryEntry({
          action: input.command.action,
          actor: input.actor,
          marker: input.marker,
          timestamp: input.nowMs,
          fieldChanged: "role",
          oldValueRedacted: oldRole,
          newValueRedacted: input.command.role,
          warnings: [],
        }),
      ]);
    } else {
      transaction.set(onboardingRef, debugPatch, { merge: true });
      transaction.set(
        onboardingRef.collection(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION).doc(`admin_account_updated_role_${input.nowMs}`),
        buildAccountHistoryEntry({
          action: input.command.action,
          actor: input.actor,
          marker: input.marker,
          timestamp: input.nowMs,
          fieldChanged: "role",
          oldValueRedacted: oldRole,
          newValueRedacted: input.command.role,
          warnings: [],
        }).entry,
        { merge: true },
      );
    }

    return true;
  });

  if (!roleUpdateApplied) {
    const blockedRoleActivationDetail = blockedRoleActivation ?? {
      targetUserId: input.command.targetUserId,
      currentRole: oldRole,
      requestedRole: input.command.role,
    };

    await Promise.allSettled([
      trackServerEvent("creator_role_activation_blocked", {
        page_path: "/admin/roster",
        admin_id: input.marker.actorUid ?? "",
        ...blockedRoleActivationDetail,
        ...actorMarkerToTelemetryPayload(input.marker),
      }, input.command.targetUserId),
      recordServerDiagnostic({
        channel: "creator_onboarding",
        severity: "warn",
        message: "Creator role activation blocked by onboarding prerequisites",
        detail: {
          ...blockedRoleActivationDetail,
          ...buildActorMarkerDebugFields(input.marker),
        },
      }),
    ]);

    return NextResponse.json({
      error: "Creator role requires completed intro, ID, and agreement steps.",
    }, { status: 400 });
  }

  await emitAccountControlTelemetry({
    action: input.command.action,
    marker: input.marker,
    targetUserId: input.command.targetUserId,
    fieldChanged: "role",
    oldValueRedacted: oldRole,
    newValueRedacted: input.command.role,
    warnings: [],
    roleUpdateServerConfirmed: true,
  }).catch(() => undefined);

  return NextResponse.json({
    success: true,
    debug: debugPatch,
  });
}

async function POST_handler(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "admin/creator-account-controls",
      rateLimit: ADMIN,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: "Database or auth not available" }, { status: 500 });
    }

    const parsed = parseCreatorAccountControlCommand(await request.json().catch(() => ({})));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const command = parsed.command;
    if (isDangerousCreatorAccountAction(command.action) && "confirmed" in command && !command.confirmed) {
      return NextResponse.json({ error: "Confirm this account change before saving." }, { status: 400 });
    }

    const isOwnerActor = isCreatorOwnerEmail(caller?.email);
    const marker = assertKnownActor(buildAdminOnBehalfMarker(
      buildAdminActor({
        uid: caller?.uid,
        email: caller?.email,
        isOwner: isOwnerActor,
      }),
      command.targetUserId,
      {
        surface: "creator_account_admin",
        route: "/admin/roster",
        actionKey: command.action,
        source: "admin_roster_account_controls",
        performedAs: "admin_on_behalf",
        targetCreatorId: command.targetUserId,
      },
    ));
    const actor = buildCreatorOnboardingActorFromMarker(marker);
    const nowMs = Date.now();
    const userRef = adminDb.collection("users").doc(command.targetUserId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return buildNotFoundResponse("user", "User not found");
    }

    const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};
    const currentEmail = readString(userData.email);
    const currentUsername = readString(userData.username);
    const currentDisplayName = readString(userData.displayName);
    const warnings: string[] = [];
    let fieldChanged = creatorAccountActionField(command.action);
    let oldValueRedacted = "";
    let newValueRedacted = "";
    let passwordResetLink: string | undefined;
    let passwordActionMode = "none";
    let emailUpdateServerConfirmed = false;
    let roleUpdateServerConfirmed = false;

    if (command.action === "update_role") {
      return updateRole({
        command,
        actor,
        marker,
        isOwnerActor,
        nowMs,
      });
    }

    if (command.action === "update_profile") {
      const userPatch: Record<string, unknown> = {};
      const queuePatch: Record<string, unknown> = {};
      const onboardingPatch: Record<string, unknown> = {};
      const authPatch: { displayName?: string } = {};

      if (command.displayName && command.displayName !== currentDisplayName) {
        userPatch.displayName = command.displayName;
        queuePatch.displayName = command.displayName;
        authPatch.displayName = command.displayName;
        fieldChanged = "displayName";
        oldValueRedacted = redactAccountControlValue("displayName", currentDisplayName);
        newValueRedacted = redactAccountControlValue("displayName", command.displayName);
      }

      if (command.username && command.username !== currentUsername) {
        fieldChanged = fieldChanged === "displayName" ? "profile" : "username";
        oldValueRedacted = redactAccountControlValue("username", currentUsername);
        newValueRedacted = redactAccountControlValue("username", command.username);
      }

      if (Object.keys(authPatch).length > 0) {
        await adminAuth.updateUser(command.targetUserId, authPatch);
      }

      const debugPatch = buildAccountDebugPatch({
        nowMs,
        actorUid: marker.actorUid,
        warnings,
      });

      if (command.username && command.username !== currentUsername) {
        const reservation = await reserveUsernameForUser({
          requestedUsername: command.username,
          uid: command.targetUserId,
          previousUsername: currentUsername,
          source: "admin_creator_account_controls",
          applyUserMutation: (transaction, normalizedUsername) => {
            transaction.set(userRef, cleanRecord({
              ...userPatch,
              username: normalizedUsername,
              adminAccountControlDebug: debugPatch,
              updatedAt: nowMs,
              updatedBy: marker.actorUid ?? "admin",
            }), { merge: true });
            transaction.set(adminDb.collection("creator_review_queue").doc(command.targetUserId), cleanRecord({
              ...queuePatch,
              username: normalizedUsername,
              ...debugPatch,
            }), { merge: true });
            transaction.set(adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(command.targetUserId), cleanRecord({
              ...onboardingPatch,
              username: normalizedUsername,
              ...debugPatch,
            }), { merge: true });
            transaction.set(
              adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(command.targetUserId).collection(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION).doc(`admin_account_updated_${fieldChanged}_${nowMs}`),
              buildAccountHistoryEntry({
                action: command.action,
                actor,
                marker,
                timestamp: nowMs,
                fieldChanged,
                oldValueRedacted,
                newValueRedacted,
                warnings,
              }).entry,
              { merge: true },
            );
          },
        });

        if (!reservation.ok) {
          return NextResponse.json({
            error: reservation.reason === "taken" ? "That handle is already taken." : "Enter a valid handle.",
          }, { status: reservation.reason === "taken" ? 409 : 400 });
        }
      } else if (Object.keys(userPatch).length > 0) {
        await writeAccountAudit({
          command,
          actor,
          marker,
          fieldChanged,
          oldValueRedacted,
          newValueRedacted,
          warnings,
          debugPatch,
          userPatch,
          queuePatch,
          onboardingPatch,
        });
      } else {
        return NextResponse.json({ error: "No profile changes detected." }, { status: 400 });
      }
    }

    if (command.action === "update_email") {
      fieldChanged = "email";
      oldValueRedacted = redactAccountControlValue("email", currentEmail);
      newValueRedacted = redactAccountControlValue("email", command.email);
      await adminAuth.updateUser(command.targetUserId, { email: command.email });
      emailUpdateServerConfirmed = true;
      const debugPatch = buildAccountDebugPatch({
        nowMs,
        actorUid: marker.actorUid,
        warnings,
        emailUpdateServerConfirmed,
      });
      await writeAccountAudit({
        command,
        actor,
        marker,
        fieldChanged,
        oldValueRedacted,
        newValueRedacted,
        warnings,
        debugPatch,
        userPatch: { email: command.email },
        queuePatch: { email: command.email },
        onboardingPatch: { email: command.email },
      });
    }

    if (command.action === "create_password_reset_link") {
      fieldChanged = "passwordReset";
      oldValueRedacted = "";
      newValueRedacted = "Reset link created";
      const email = currentEmail || (await adminAuth.getUser(command.targetUserId)).email || "";
      if (!email) {
        return NextResponse.json({ error: "Target account does not have an email address." }, { status: 400 });
      }
      passwordResetLink = await adminAuth.generatePasswordResetLink(email);
      passwordActionMode = "reset_link_created";
      const debugPatch = buildAccountDebugPatch({
        nowMs,
        actorUid: marker.actorUid,
        warnings,
        passwordActionMode,
      });
      await writeAccountAudit({
        command,
        actor,
        marker,
        fieldChanged,
        oldValueRedacted,
        newValueRedacted,
        warnings,
        debugPatch,
      });
    }

    if (command.action === "set_temporary_password") {
      fieldChanged = "temporaryPassword";
      oldValueRedacted = "[password hidden]";
      newValueRedacted = "[password hidden]";
      await adminAuth.updateUser(command.targetUserId, { password: command.temporaryPassword });
      passwordActionMode = "temporary_password_set";
      const debugPatch = buildAccountDebugPatch({
        nowMs,
        actorUid: marker.actorUid,
        warnings,
        passwordActionMode,
      });
      await writeAccountAudit({
        command,
        actor,
        marker,
        fieldChanged,
        oldValueRedacted,
        newValueRedacted,
        warnings,
        debugPatch,
      });
    }

    if (command.action === "update_status") {
      fieldChanged = "status";
      oldValueRedacted = redactAccountControlValue("status", userData.status);
      newValueRedacted = redactAccountControlValue("status", command.status);
      await adminAuth.updateUser(command.targetUserId, { disabled: command.status !== "active" });
      const debugPatch = buildAccountDebugPatch({
        nowMs,
        actorUid: marker.actorUid,
        warnings,
      });
      await writeAccountAudit({
        command,
        actor,
        marker,
        fieldChanged,
        oldValueRedacted,
        newValueRedacted,
        warnings,
        debugPatch,
        userPatch: {
          status: command.status,
          statusReason: command.statusReason ?? "",
        },
        queuePatch: {
          status: command.status,
        },
      });
    }

    if (command.action === "update_notification_settings") {
      fieldChanged = "notificationSettings";
      oldValueRedacted = "Previous settings";
      newValueRedacted = "Updated settings";
      const debugPatch = buildAccountDebugPatch({
        nowMs,
        actorUid: marker.actorUid,
        warnings,
      });
      await writeAccountAudit({
        command,
        actor,
        marker,
        fieldChanged,
        oldValueRedacted,
        newValueRedacted,
        warnings,
        debugPatch,
        userPatch: {
          notificationSettings: command.notificationSettings,
        },
      });
    }

    await emitAccountControlTelemetry({
      action: command.action,
      marker,
      targetUserId: command.targetUserId,
      fieldChanged,
      oldValueRedacted,
      newValueRedacted,
      warnings,
      passwordActionMode,
      emailUpdateServerConfirmed,
      roleUpdateServerConfirmed,
    }).catch((error) => {
      void recordServerDiagnostic({
        channel: "creator_onboarding",
        severity: "warn",
        message: "Creator account control telemetry failed",
        detail: {
          action: command.action,
          ...buildActorMarkerDebugFields(marker),
          error: error instanceof Error ? error.message : String(error),
        },
      });
    });

    return NextResponse.json({
      success: true,
      passwordResetLink,
      debug: buildAccountDebugPatch({
        nowMs,
        actorUid: marker.actorUid,
        warnings,
        passwordActionMode,
        emailUpdateServerConfirmed,
        roleUpdateServerConfirmed,
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      return buildNotFoundResponse("user", "User not found");
    }
    if (error instanceof Error && error.message.includes("Creator role requires")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error, "Admin.CreatorAccountControls.POST");
  }
}

export let POST = withRouteRuntimeHealth("admin/creator-account-controls:POST", POST_handler);
