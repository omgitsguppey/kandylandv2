import "server-only";

import { parseCreatorThreadId } from "@/lib/chat";
import { CREATOR_COLLECTIONS } from "@/lib/creator-experiences";
import { CHAT_MEDIA_LIMIT_BYTES_DEFAULT, CHAT_MEDIA_LIMIT_BYTES_FAN_PASS } from "@/lib/chat/chat-media-limits";
import { adminDb } from "@/lib/server/firebase-admin";

export type ServerChatMediaLimitPolicy = {
  hasFanPass: boolean;
  maxBytes: number;
};

export async function resolveServerChatMediaLimitPolicy(input: {
  threadId: string;
  actorUid: string;
}): Promise<ServerChatMediaLimitPolicy> {
  const parsed = parseCreatorThreadId(input.threadId);
  if (!parsed || parsed.userId !== input.actorUid || !adminDb) {
    return {
      hasFanPass: false,
      maxBytes: CHAT_MEDIA_LIMIT_BYTES_DEFAULT,
    };
  }

  const subscriptionId = `${parsed.userId}__${parsed.creatorId}`;
  const subscriptionSnap = await adminDb.collection(CREATOR_COLLECTIONS.subscriptions).doc(subscriptionId).get();
  const status = subscriptionSnap.exists
    ? ((subscriptionSnap.data() as Record<string, unknown>).status as string | undefined)
    : undefined;
  const hasFanPass = status === "active";

  return {
    hasFanPass,
    maxBytes: hasFanPass ? CHAT_MEDIA_LIMIT_BYTES_FAN_PASS : CHAT_MEDIA_LIMIT_BYTES_DEFAULT,
  };
}
