export const DAILY_TASK_LEGACY_BLOCKED_PATHS = [
  "shouldRotateIncompleteCycle",
  "shouldRotateCompletedCycle",
  "rotate incomplete cycle because nextRefreshMs is malformed",
  "rotate incomplete cycle because nextRefreshMs <= lastResetMs",
  "rotate incomplete cycle because state shape is stale",
  "legacy reward raw multiplication outside resolver",
  "task reward direct balance increment",
  "task failure before window end",
] as const;

export const DAILY_TASK_LEGACY_BLOCKED_DESCRIPTIONS: Record<(typeof DAILY_TASK_LEGACY_BLOCKED_PATHS)[number], string> = {
  shouldRotateIncompleteCycle: "Blocked: active-window task rotation is no longer canonical.",
  shouldRotateCompletedCycle: "Blocked: completed tasks stay claimed until the current window ends.",
  "rotate incomplete cycle because nextRefreshMs is malformed": "Blocked: malformed refresh metadata is repaired, not used to rotate active tasks.",
  "rotate incomplete cycle because nextRefreshMs <= lastResetMs": "Blocked: next refresh timestamp no longer controls active-window rotation.",
  "rotate incomplete cycle because state shape is stale": "Blocked: stale shape is repaired in place when the window is still active.",
  "legacy reward raw multiplication outside resolver": "Blocked: daily-task rewards are normalized once through the VNext resolver.",
  "task reward direct balance increment": "Blocked: task rewards credit reward-source balance through the source-aware ledger only.",
  "task failure before window end": "Blocked: inactivity before window end is not a failure state.",
} as const;
