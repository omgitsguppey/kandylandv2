export const CHAT_MEDIA_LIMIT_BYTES_DEFAULT = 25 * 1024 * 1024;
export const CHAT_MEDIA_LIMIT_BYTES_FAN_PASS = 500 * 1024 * 1024;

export type ChatMediaLimitResult = {
  maxBytes: number;
  hasFanPass: boolean;
  errorCode: "file_too_large" | "file_too_large_requires_fan_pass" | "fan_pass_file_limit_exceeded";
};

export function resolveChatMediaLimit(input: { hasFanPass: boolean; fileSizeBytes: number }): ChatMediaLimitResult {
  const hasFanPass = input.hasFanPass === true;
  const maxBytes = hasFanPass ? CHAT_MEDIA_LIMIT_BYTES_FAN_PASS : CHAT_MEDIA_LIMIT_BYTES_DEFAULT;
  const size = Number.isFinite(input.fileSizeBytes) ? Math.max(0, Math.trunc(input.fileSizeBytes)) : 0;
  const errorCode = hasFanPass ? "fan_pass_file_limit_exceeded" : "file_too_large_requires_fan_pass";
  return {
    maxBytes,
    hasFanPass,
    errorCode: size > maxBytes ? errorCode : "file_too_large",
  };
}

export function formatChatMediaLimitMb(maxBytes: number) {
  return Math.round(maxBytes / (1024 * 1024));
}
