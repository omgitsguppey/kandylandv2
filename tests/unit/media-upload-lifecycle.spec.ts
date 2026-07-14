import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  MEDIA_UPLOAD_LIFECYCLE_EVENTS,
  buildMediaUploadDebugLane,
  buildMediaUploadLifecycleEvent,
  classifyMediaUploadBlock,
  detectMediaUploadOrphanState,
  fingerprintStoragePath,
  validateMediaUploadLifecyclePayload,
} from "@/lib/media/media-upload-contract";
import {
  buildMediaUploadTelemetryEnvelope,
  listMediaUploadTelemetryEvents,
} from "@/lib/media/media-upload-telemetry";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";
import { translateEnvelopeToDebugEvidence, translateEnvelopeToFeatureActivity, translateEnvelopeToPersonMetric } from "@/lib/analytics/event-translation-bridge";
import {
  isChatAttachmentFinalizedReceipt,
  resolveChatAttachmentRetryAction,
  resolveChatAttachmentRetryDisposition,
  shouldClearChatPendingOperation,
} from "@/lib/chat-attachments";

const ROOT = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("media upload lifecycle", () => {
  it("accepts only a finalized Chat attachment receipt for the exact operation", () => {
    const operation = {
      operationKey: "message-key",
      uploadId: "upload-1",
      correlationId: "message-key",
      storagePath: "creator/messages/user/thread/file.png",
    };
    const receipt = {
      success: true,
      status: "finalized",
      idempotencyKey: "message-key",
      uploadId: "upload-1",
      correlationId: "message-key",
      storagePath: "creator/messages/user/thread/file.png",
      assetUrl: "https://storage.example/file.png",
    };

    expect(isChatAttachmentFinalizedReceipt(receipt, operation)).toBe(true);
    expect(isChatAttachmentFinalizedReceipt({ ...receipt, status: "pending" }, operation)).toBe(false);
    expect(isChatAttachmentFinalizedReceipt({ ...receipt, idempotencyKey: "other-key" }, operation)).toBe(false);
    expect(isChatAttachmentFinalizedReceipt({ ...receipt, storagePath: "other/path.png" }, operation)).toBe(false);
  });

  it("classifies Chat attachment retries without reusing a confirmed-canceled operation", () => {
    const storageFailure = resolveChatAttachmentRetryDisposition({
      phase: "storage",
    });
    const lostComplete = resolveChatAttachmentRetryDisposition({
      phase: "complete",
      responseStatus: 200,
      responseParsed: false,
    });
    const inProgress = resolveChatAttachmentRetryDisposition({
      phase: "complete",
      responseStatus: 409,
      responseParsed: true,
      detail: { errorCode: "attachment_complete_in_progress", retryable: true },
    });
    const canceled = resolveChatAttachmentRetryDisposition({
      phase: "complete",
      responseStatus: 409,
      responseParsed: true,
      detail: { errorCode: "attachment_canceled" },
    });
    const alreadyAttached = resolveChatAttachmentRetryDisposition({
      phase: "complete",
      responseStatus: 409,
      responseParsed: true,
      detail: { errorCode: "attachment_already_attached" },
    });

    expect(storageFailure).toBe("cancel_then_rotate");
    expect(resolveChatAttachmentRetryAction({
      disposition: storageFailure,
      cancelState: "canceled",
    })).toEqual({ outcome: "rotate", retainOperation: false, clearOperationKey: true });
    expect(resolveChatAttachmentRetryAction({ disposition: lostComplete })).toEqual({
      outcome: "retry",
      retainOperation: true,
      clearOperationKey: false,
    });
    expect(resolveChatAttachmentRetryAction({ disposition: inProgress })).toEqual({
      outcome: "retry",
      retainOperation: true,
      clearOperationKey: false,
    });
    expect(resolveChatAttachmentRetryAction({ disposition: canceled })).toEqual({
      outcome: "rotate",
      retainOperation: false,
      clearOperationKey: true,
    });
    expect(resolveChatAttachmentRetryAction({ disposition: alreadyAttached })).toEqual({
      outcome: "committed",
      retainOperation: false,
      clearOperationKey: true,
    });
    expect(shouldClearChatPendingOperation({
      serverErrorCode: "attachment_canceled",
      cleanupState: "unconfirmed",
      definitiveServerFailure: true,
      hasUploadedAttachment: true,
    })).toBe(true);
    expect(shouldClearChatPendingOperation({
      serverErrorCode: "invalid_attachment",
      cleanupState: "unconfirmed",
      definitiveServerFailure: true,
      hasUploadedAttachment: true,
    })).toBe(false);
  });

  it("defines the canonical prepare, storage, complete, cancel, orphan, and block lifecycle", () => {
    expect(MEDIA_UPLOAD_LIFECYCLE_EVENTS).toEqual([
      "media_upload_prepare_started",
      "media_upload_prepare_completed",
      "media_upload_prepare_failed",
      "media_storage_upload_started",
      "media_storage_upload_completed",
      "media_storage_upload_failed",
      "media_upload_complete_started",
      "media_upload_complete_completed",
      "media_upload_complete_failed",
      "media_upload_cancelled",
      "media_upload_orphaned",
      "media_upload_recovered",
      "media_upload_blocked_size",
      "media_upload_blocked_type",
    ]);

    expect(classifyMediaUploadBlock({
      mimeType: "application/pdf",
      sizeBytes: 128,
      maxBytes: 1024,
      allowedMimeTypes: ["image/", "video/"],
    })).toMatchObject({ blocked: true, eventName: "media_upload_blocked_type" });
    expect(classifyMediaUploadBlock({
      mimeType: "image/png",
      sizeBytes: 2048,
      maxBytes: 1024,
      allowedMimeTypes: ["image/", "video/"],
    })).toMatchObject({ blocked: true, eventName: "media_upload_blocked_size" });
  });

  it("sanitizes broad telemetry and debug payloads while preserving storage fingerprints", () => {
    const rawStoragePath = "creator/messages/user_1/thread_1/upload.png";
    const payload = buildMediaUploadLifecycleEvent({
      eventName: "media_storage_upload_completed",
      uploadId: "upload_1",
      correlationId: "upload_1",
      ownerUserId: "user_1",
      featureId: "support",
      surface: "chat",
      mediaKind: "image",
      mimeType: "image/png",
      sizeBytes: 1200,
      maxBytes: 25 * 1024 * 1024,
      storagePath: rawStoragePath,
      assetUrl: "https://firebasestorage.googleapis.com/v0/b/private/o/creator%2Fmessages%2Fuser_1%2Fthread_1%2Fupload.png?token=secret",
      status: "completed",
      durationMs: 42,
      retryCount: 0,
      privacyClass: "required_integrity",
    });

    expect(payload.storagePathFingerprint).toBe(fingerprintStoragePath(rawStoragePath));
    expect(JSON.stringify(payload)).not.toContain(rawStoragePath);
    expect(JSON.stringify(payload)).not.toContain("firebasestorage.googleapis.com");
    expect(JSON.stringify(payload)).not.toContain("token=secret");
    expect(payload.assetUrlPolicy).toBe("private_url_not_logged");
    expect(validateMediaUploadLifecyclePayload(payload)).toEqual([]);
  });

  it("maps media lifecycle events through envelope, feature activity, debug, and person metrics", () => {
    const eventNames = listMediaUploadTelemetryEvents();
    const catalogEventNames = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
    expect(eventNames).toEqual([...MEDIA_UPLOAD_LIFECYCLE_EVENTS]);

    for (const eventName of eventNames) {
      expect(catalogEventNames.has(eventName)).toBe(true);
      const envelope = buildMediaUploadTelemetryEnvelope({
        eventName,
        uploadId: `upload_${eventName}`,
        correlationId: `upload_${eventName}`,
        ownerUserId: "user_1",
        featureId: "support",
        surface: "chat",
        mediaKind: "image",
        mimeType: "image/png",
        sizeBytes: 1200,
        maxBytes: 25 * 1024 * 1024,
        storagePath: "creator/messages/user_1/thread_1/upload.png",
        status: eventName.includes("failed") ? "failed" : "completed",
        failureReason: eventName.includes("failed") ? "storage_error" : undefined,
        durationMs: 10,
        retryCount: 0,
        privacyClass: "required_integrity",
      });
      const activity = translateEnvelopeToFeatureActivity({ envelope, observedActivityCount: 0 });
      const debug = translateEnvelopeToDebugEvidence({ envelope, featureActivity: activity });
      const personMetric = translateEnvelopeToPersonMetric({ envelope });

      expect(envelope.pipelineStatus).toBe("normal");
      expect(envelope.metadata.storagePathFingerprint).toBeTruthy();
      expect(envelope.metadata.storagePath).toBeUndefined();
      expect(activity.producerRegistered).toBe(true);
      expect(activity.materializerMapped).toBe(true);
      expect(activity.debugLaneMapped).toBe(true);
      expect(debug.status).not.toBe("failed");
      expect(personMetric.classificationStatus).not.toBe("missing_classification");
    }
  });

  it("makes orphan risk and debug lane evidence explicit", () => {
    expect(detectMediaUploadOrphanState({
      preparedAtMs: 1_000,
      completedAtMs: null,
      nowMs: 1_000 + 31 * 60_000,
      orphanAfterMs: 30 * 60_000,
    })).toMatchObject({
      orphaned: true,
      eventName: "media_upload_orphaned",
    });

    const lane = buildMediaUploadDebugLane([
      buildMediaUploadLifecycleEvent({
        eventName: "media_upload_prepare_failed",
        uploadId: "upload_prepare",
        ownerUserId: "user_1",
        featureId: "support",
        surface: "chat",
        mediaKind: "image",
        mimeType: "image/png",
        sizeBytes: 1,
        maxBytes: 25 * 1024 * 1024,
        status: "failed",
        failureReason: "network",
        durationMs: 5,
        retryCount: 0,
        privacyClass: "required_integrity",
      }),
      buildMediaUploadLifecycleEvent({
        eventName: "media_upload_orphaned",
        uploadId: "upload_orphan",
        ownerUserId: "user_1",
        featureId: "support",
        surface: "chat",
        mediaKind: "video",
        mimeType: "video/mp4",
        sizeBytes: 2,
        maxBytes: 25 * 1024 * 1024,
        status: "orphaned",
        durationMs: 10,
        retryCount: 0,
        privacyClass: "required_integrity",
      }),
    ]);

    expect(lane.label).toBe("Media upload");
    expect(lane.prepareFailures).toBe(1);
    expect(lane.orphanRiskCount).toBe(1);
    expect(lane.sizeTypeBlockCount).toBe(0);
    expect(lane.averageUploadDurationMs).toBe(8);
  });

  it("keeps chat prepare and complete contracts correlated and ownership scoped", () => {
    const prepareRoute = readSource("src/app/api/chat/attachments/prepare/route.ts");
    const completeRoute = readSource("src/app/api/chat/attachments/complete/route.ts");
    const chatExperience = readSource("src/components/Chat/ChatExperience.tsx");

    expect(prepareRoute).toContain("uploadId");
    expect(prepareRoute).toContain("correlationId");
    expect(prepareRoute).toContain("orphanDetectionAfterMs");
    expect(completeRoute).toContain("uploadId");
    expect(completeRoute).toContain("correlationId");
    expect(completeRoute).toContain("assertChatAttachmentUploadOwnership");
    expect(completeRoute).toContain("assetUrlPolicy");
    expect(completeRoute).toContain('chatAttachmentFinalized: "true"');
    expect(chatExperience).toContain("media_upload_prepare_started");
    expect(chatExperience).toContain("media_storage_upload_started");
    expect(chatExperience).toContain("media_upload_complete_completed");
    expect(chatExperience).toContain("resolvePendingClientIdempotencyKey");
    expect(chatExperience).toContain("resolveDurableClientIdempotencyKey");
    expect(chatExperience).toContain('action: "chat-text-send"');
    expect(chatExperience).toContain("pendingChatSendsRef.current.get(activeSendKey)");
    expect(chatExperience).toContain("activePendingSend.uploadedAttachment = uploadedAttachment");
    expect(chatExperience).toContain("pendingSend.attachmentOperation = attachmentOperation");
    expect(chatExperience).toContain("clearDurableClientIdempotencyKey(activePendingSend.idempotency)");
    expect(chatExperience).not.toContain("window.sessionStorage");
    expect(chatExperience).not.toContain("pendingChatSendRef");
    expect(chatExperience).toContain("const definitiveServerFailure = isDefinitiveClientRejectionStatus(sendResponseStatus, sendResponseProblem)");
    expect(chatExperience).toContain("idempotencyKey: operationKey");
    expect(chatExperience).toContain("operationKey: idempotencyKey");
    expect(chatExperience).toContain('body.status === "canceled"');
    expect(chatExperience).toContain('disposition: "retry_same_operation"');
    expect(chatExperience).toContain("isChatAttachmentFinalizedReceipt(completeBody");
    expect(chatExperience).toContain("storagePath: attachmentOperation.storagePath");
    expect(chatExperience).toContain("shouldClearChatPendingOperation({");
    expect(chatExperience).toContain("serverErrorCode: sendResponseProblem?.errorCode");
    expect(chatExperience).not.toContain("sendResponseStatus !== null && sendResponseStatus < 500");
    expect(chatExperience).not.toContain("Open attachment");
    expect(chatExperience).not.toContain("reportStorageIssue(\"chat attachment upload\", error, {\n                fileName: composerFile.name,\n                mimeType: composerFile.type,\n                threadId: selectedThreadId,\n                storagePath: preparedStoragePath,");
  });

  it("keeps async Chat sends scoped to their selected-thread generation and current draft", () => {
    const chatExperience = readSource("src/components/Chat/ChatExperience.tsx");

    expect(chatExperience).toContain("const selectedThreadGenerationRef = useRef(0)");
    expect(chatExperience).toContain("selectedThreadGenerationRef.current += 1");
    expect(chatExperience).toContain("isChatSendThreadCurrent({");
    expect(chatExperience).toContain("currentActorId: chatUserIdentityRef.current");
    expect(chatExperience).toContain("currentThreadId: selectedThreadIdRef.current");
    expect(chatExperience).toContain("current?.thread.id === sendThreadId");
    expect(chatExperience).toContain("if (warningMessage && isSendContextCurrent())");
    expect(chatExperience).toContain("composerFileRef.current === currentComposerFile");
    expect(chatExperience).toContain("current.trim().length === 0 ? currentComposerText : current");
    expect(chatExperience).toContain("const composerRecoveryByThreadRef = useRef(new Map<string, ChatComposerRecoveryState>())");
    expect(chatExperience).toContain("rememberComposerRecovery(activeSendKey, activePendingSend.composerRecovery)");
    expect(chatExperience).toContain("composerRecoveryByThreadRef.current.get(activeSendKey)");
    expect(chatExperience).toContain("resolveChatComposerRecoveryUpdate({");
    expect(chatExperience).toContain("selectChatComposerFileRecoveryEvictions({");
    expect(chatExperience).toContain("stripChatComposerRecoveryFile(mappedRecovery)");
    expect(chatExperience).toContain('if (composerKind !== "text" && !composerFile)');
    expect(chatExperience).toContain('buildChatSendErrorMessage({ errorCode: "invalid_attachment" })');
    expect(chatExperience).toContain("file: currentComposerFile");
    expect(chatExperience).toContain("errorMessage: message");
    expect(chatExperience).toContain("canReuseChatPendingSend({");
    expect(chatExperience).toContain("const unmatchedAttachmentStoragePath = !matchingPreviousPending");
    expect(chatExperience).toContain('cleanupResult.state === "unconfirmed"');
    expect(chatExperience).not.toContain("setSelectedThreadId(thread.id)");
  });

  it("classifies the complete attachment lifecycle, including cancellation, as reviewable source", () => {
    const validator = readSource("scripts/agent/validate-media-upload-lifecycle.ts");

    expect(validator).toContain('normalized === "src/app/api/chat/attachments/prepare/route.ts"');
    expect(validator).toContain('normalized === "src/app/api/chat/attachments/complete/route.ts"');
    expect(validator).toContain('normalized === "src/app/api/chat/attachments/cancel/route.ts"');
    expect(validator).toContain('return "real_source_change_needs_review"');
  });
});
