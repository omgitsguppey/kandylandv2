import { describe, expect, it } from "vitest";

import {
  CHAT_MEDIA_LIMIT_BYTES_DEFAULT,
  CHAT_MEDIA_LIMIT_BYTES_FAN_PASS,
  resolveChatMediaLimit,
} from "@/lib/chat/chat-media-limits";

describe("chat-media-limits", () => {
  it("uses 25 MB for non fan-pass uploads", () => {
    const limit = resolveChatMediaLimit({ hasFanPass: false, fileSizeBytes: CHAT_MEDIA_LIMIT_BYTES_DEFAULT + 1 });
    expect(limit.maxBytes).toBe(CHAT_MEDIA_LIMIT_BYTES_DEFAULT);
    expect(limit.errorCode).toBe("file_too_large_requires_fan_pass");
  });

  it("uses 500 MB for fan-pass uploads", () => {
    const limit = resolveChatMediaLimit({ hasFanPass: true, fileSizeBytes: CHAT_MEDIA_LIMIT_BYTES_FAN_PASS + 1 });
    expect(limit.maxBytes).toBe(CHAT_MEDIA_LIMIT_BYTES_FAN_PASS);
    expect(limit.errorCode).toBe("fan_pass_file_limit_exceeded");
  });
});
