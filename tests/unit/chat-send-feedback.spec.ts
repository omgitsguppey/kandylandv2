import { describe, expect, it } from "vitest";

import {
    buildChatActorThreadKey,
    buildChatSendErrorMessage,
    buildChatSendWarningMessage,
    canReuseChatPendingSend,
    isChatSendThreadCurrent,
    isChatSendSuccessReceipt,
    resolveChatComposerRecovery,
    resolveChatComposerRecoveryUpdate,
    selectChatComposerFileRecoveryEvictions,
    selectChatComposerRecoveryEvictions,
    stripChatComposerRecoveryFile,
} from "@/lib/chat-send-feedback";

describe("chat send feedback", () => {
    it("restores a failed send only for its actor and thread", () => {
        const actorAThreadA = buildChatActorThreadKey("actor-a", "thread-a");
        const actorAThreadB = buildChatActorThreadKey("actor-a", "thread-b");
        const file = new File(["proof"], "proof.png", {
            type: "image/png",
            lastModified: 1,
        });
        const pendingByKey = new Map<string, { composerRecovery: {
            text: string;
            file: typeof file | null;
            errorMessage: string | null;
        } }>();
        const recoveryByKey = new Map<string, {
            text: string;
            file: typeof file | null;
            errorMessage: string | null;
        }>();

        pendingByKey.set(actorAThreadA, {
            composerRecovery: { text: "draft A", file, errorMessage: null },
        });
        expect(resolveChatComposerRecovery({
            activeKey: actorAThreadB,
            pendingByKey,
            recoveryByKey,
        })).toBeNull();

        pendingByKey.delete(actorAThreadA);
        recoveryByKey.set(actorAThreadA, {
            text: "draft A",
            file,
            errorMessage: "We couldn't send your message. Try again shortly.",
        });
        expect(resolveChatComposerRecovery({
            activeKey: actorAThreadA,
            pendingByKey,
            recoveryByKey,
        })).toEqual({
            text: "draft A",
            file,
            errorMessage: "We couldn't send your message. Try again shortly.",
        });
    });

    it("settles A after A to B to A and never reuses a distinct same-metadata File", () => {
        expect(isChatSendThreadCurrent({
            currentActorId: "actor-a",
            currentThreadId: "thread-b",
            sendActorId: "actor-a",
            sendThreadId: "thread-a",
        })).toBe(false);
        expect(isChatSendThreadCurrent({
            currentActorId: "actor-a",
            currentThreadId: "thread-a",
            sendActorId: "actor-a",
            sendThreadId: "thread-a",
        })).toBe(true);

        const retainedFile = new File(["old bytes"], "same.png", {
            type: "image/png",
            lastModified: 10,
        });
        const replacementFile = new File(["new bytes"], "same.png", {
            type: "image/png",
            lastModified: 10,
        });
        expect(retainedFile.size).toBe(replacementFile.size);
        expect(canReuseChatPendingSend({
            pendingFingerprint: "same-metadata-fingerprint",
            currentFingerprint: "same-metadata-fingerprint",
            pendingFile: retainedFile,
            currentFile: replacementFile,
        })).toBe(false);
        expect(canReuseChatPendingSend({
            pendingFingerprint: "same-metadata-fingerprint",
            currentFingerprint: "same-metadata-fingerprint",
            pendingFile: retainedFile,
            currentFile: retainedFile,
        })).toBe(true);
    });

    it("keeps a replacement File separate when old attachment cleanup is unconfirmed", () => {
        const key = buildChatActorThreadKey("actor-a", "thread-a");
        const oldFile = new File(["old bytes"], "same.png", { type: "image/png", lastModified: 10 });
        const newFile = new File(["new bytes"], "same.png", { type: "image/png", lastModified: 10 });
        type Recovery = { text: string; file: File | null; errorMessage: string | null };
        type Pending = {
            composerRecovery: Recovery;
            uploadedAttachment: { assetUrl: string; storagePath: string };
        };
        const pendingByKey = new Map<string, Pending>([[key, {
            composerRecovery: { text: "old", file: oldFile, errorMessage: null },
            uploadedAttachment: { assetUrl: "old-asset", storagePath: "old-path" },
        }]]);
        const recoveryByKey = new Map<string, Recovery>([[key, {
            text: "new",
            file: newFile,
            errorMessage: "cleanup unconfirmed",
        }]]);

        expect(resolveChatComposerRecovery({ activeKey: key, pendingByKey, recoveryByKey })).toEqual({
            text: "new",
            file: newFile,
            errorMessage: "cleanup unconfirmed",
        });
        const update = resolveChatComposerRecoveryUpdate({
            mappedRecovery: recoveryByKey.get(key),
            pendingRecovery: pendingByKey.get(key)?.composerRecovery,
            patch: { text: "new edited" },
        });
        expect(update).toEqual({
            recovery: {
                text: "new edited",
                file: newFile,
                errorMessage: "cleanup unconfirmed",
            },
            shouldUpdatePending: false,
        });
        if (update?.shouldUpdatePending) {
            pendingByKey.get(key)!.composerRecovery = update.recovery;
        }
        expect(pendingByKey.get(key)?.composerRecovery).toEqual({
            text: "old",
            file: oldFile,
            errorMessage: null,
        });
        expect(canReuseChatPendingSend({
            pendingFingerprint: "same-metadata-fingerprint",
            currentFingerprint: "same-metadata-fingerprint",
            pendingFile: pendingByKey.get(key)?.composerRecovery.file,
            currentFile: newFile,
        })).toBe(false);
        expect(pendingByKey.get(key)?.uploadedAttachment).toEqual({
            assetUrl: "old-asset",
            storagePath: "old-path",
        });
    });

    it("evicts only the oldest settled composer recoveries", () => {
        expect(selectChatComposerRecoveryEvictions({
            recoveryKeys: ["settled-oldest", "active", "settled-newer", "settled-newest"],
            activeKeys: new Set(["active"]),
            maxSettledEntries: 2,
        })).toEqual(["settled-oldest"]);
    });

    it("bounds settled File retention without erasing compact draft recovery", () => {
        const oldestRecovery = {
            text: "keep this caption",
            messageKind: "image" as const,
            file: new File(["proof"], "proof.png", { type: "image/png" }),
            errorMessage: "retry when ready",
        };

        expect(selectChatComposerFileRecoveryEvictions({
            recoveryKeys: ["oldest-file", "active-file", "newer-file", "newest-file"],
            activeKeys: new Set(["active-file"]),
            maxSettledFileEntries: 2,
        })).toEqual(["oldest-file"]);
        expect(stripChatComposerRecoveryFile(oldestRecovery)).toEqual({
            text: "keep this caption",
            messageKind: "image",
            file: null,
            errorMessage: "retry when ready",
        });
    });

    it("requires the exact canonical message and thread receipt before settling", () => {
        const expected = {
            threadId: "thread-a",
            viewerRole: "user" as const,
            messageKind: "image" as const,
            text: "caption",
            assetUrl: "asset-url",
            assetName: "image.png",
            assetMimeType: "image/png",
        };
        const receipt = {
            success: true,
            message: {
                id: "message-a",
                threadId: "thread-a",
                senderRole: "user",
                messageKind: "image",
                text: "caption",
                assetUrl: "asset-url",
                assetName: "image.png",
                assetMimeType: "image/png",
                createdAt: 1,
            },
            thread: { id: "thread-a", viewerRole: "user" },
            pricing: {},
        };

        expect(isChatSendSuccessReceipt(receipt, expected)).toBe(true);
        expect(isChatSendSuccessReceipt({ ...receipt, success: undefined }, expected)).toBe(false);
        expect(isChatSendSuccessReceipt({ ...receipt, message: { ...receipt.message, id: "" } }, expected)).toBe(false);
        expect(isChatSendSuccessReceipt({ ...receipt, thread: { ...receipt.thread, id: "thread-b" } }, expected)).toBe(false);
        expect(isChatSendSuccessReceipt({ ...receipt, message: { ...receipt.message, assetUrl: "other" } }, expected)).toBe(false);
    });

    it("maps known send error codes to user-facing messages", () => {
        expect(buildChatSendErrorMessage({ errorCode: "forbidden" })).toBe(
            "You are not allowed to send messages in this thread.",
        );
        expect(buildChatSendErrorMessage({ errorCode: "creator_unavailable" })).toBe(
            "Messaging is unavailable for this creator right now.",
        );
        expect(buildChatSendErrorMessage({ errorCode: "invalid_attachment" })).toBe(
            "This message type needs a valid attachment before it can be sent.",
        );
    });

    it("falls back to a human-readable generic message when no known code exists", () => {
        expect(buildChatSendErrorMessage({ error: "Something specific failed." })).toBe(
            "We couldn't send your message. Try again shortly.",
        );
    });

    it("surfaces post-send tracking degradation as a warning", () => {
        expect(buildChatSendWarningMessage([
            { code: "post_send_tracking_failure", detail: "diagnostic failed" },
        ])).toBe(
            "Message sent, but tracking degraded after delivery. Admin debug will show the warning.",
        );
    });

    it("returns null when there are no warnings", () => {
        expect(buildChatSendWarningMessage([])).toBeNull();
        expect(buildChatSendWarningMessage(null)).toBeNull();
    });
});
