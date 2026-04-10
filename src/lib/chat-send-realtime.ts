import type { ChatThreadDetail, ChatThreadPricing, ChatThreadRecord } from "@/lib/chat";
import type { CreatorMessage } from "@/types/db";

export type ChatSendRealtimePayload = {
    thread: ChatThreadRecord;
    message: CreatorMessage;
    pricing?: ChatThreadPricing;
};

export function reconcileChatSendSuccess(
    current: ChatThreadDetail | null,
    input: ChatSendRealtimePayload & {
        optimisticMessageId?: string | null;
    },
) {
    if (!current) {
        return current;
    }

    const nextMessages = current.messages
        .filter((message) => (
            message.id !== input.message.id
            && (!input.optimisticMessageId || message.id !== input.optimisticMessageId)
        ))
        .concat(input.message)
        .sort((left, right) => {
            if (left.createdAt !== right.createdAt) {
                return left.createdAt - right.createdAt;
            }

            return left.id.localeCompare(right.id);
        });

    return {
        ...current,
        thread: input.thread,
        pricing: input.pricing ?? current.pricing,
        messages: nextMessages,
    } satisfies ChatThreadDetail;
}
