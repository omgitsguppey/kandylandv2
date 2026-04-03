import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TASK_GUIDANCE_ACTION_STORAGE_KEY,
  clearTaskGuidanceStorage,
  createTaskGuidancePendingAction,
  isTaskGuidanceActionType,
  readTaskGuidancePendingAction,
  writeTaskGuidancePendingAction,
} from "@/lib/task-guidance";

function createStorageMock() {
  const store: Record<string, string> = {};

  return {
    store,
    storage: {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
    },
  };
}

describe("isTaskGuidanceActionType", () => {
  beforeEach(() => {
    const { storage: sessionStorage } = createStorageMock();
    const { store: localStore, storage: localStorage } = createStorageMock();
    localStore[TASK_GUIDANCE_ACTION_STORAGE_KEY] = JSON.stringify({
      taskId: "legacy-task",
      actionType: "open_dashboard",
      destinationHref: "/dashboard",
      createdAt: 1,
    });

    vi.stubGlobal("window", { localStorage, sessionStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should return true for valid task guidance action types", () => {
    expect(isTaskGuidanceActionType("open_notifications")).toBe(true);
    expect(isTaskGuidanceActionType("open_wallet")).toBe(true);
    expect(isTaskGuidanceActionType("enable_notifications")).toBe(true);
    expect(isTaskGuidanceActionType("give_feedback")).toBe(true);
  });

  it("should return false for invalid action types", () => {
    expect(isTaskGuidanceActionType("open_dashboard" as any)).toBe(false);
    expect(isTaskGuidanceActionType("open_drops" as any)).toBe(false);
    expect(isTaskGuidanceActionType("invalid_action" as any)).toBe(false);
    expect(isTaskGuidanceActionType("" as any)).toBe(false);
    expect(isTaskGuidanceActionType("invalid_action" as any)).toBe(false);
  });

  it("should return false for null or undefined", () => {
    expect(isTaskGuidanceActionType(null as any)).toBe(false);
    expect(isTaskGuidanceActionType(undefined as any)).toBe(false);
  });

  it("stores pending guidance actions in sessionStorage and clears legacy localStorage copies", () => {
    writeTaskGuidancePendingAction({
      taskId: "task_1",
      actionType: "open_notifications",
      destinationHref: "/dashboard#home",
      assignedAt: 42,
      createdAt: 99,
    } as any);

    const action = readTaskGuidancePendingAction();
    expect(action).toEqual({
      taskId: "task_1",
      actionType: "open_notifications",
      destinationHref: "/dashboard#home",
      assignedAt: 42,
      createdAt: 99,
    });
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      TASK_GUIDANCE_ACTION_STORAGE_KEY,
      JSON.stringify(action),
    );
    expect(window.localStorage.removeItem).toHaveBeenCalledWith(TASK_GUIDANCE_ACTION_STORAGE_KEY);
  });

  it("clears session-scoped task guidance state without leaving persistent copies behind", () => {
    writeTaskGuidancePendingAction({
      taskId: "task_2",
      actionType: "open_wallet",
      destinationHref: "/drops",
      assignedAt: 7,
      createdAt: 8,
    } as any);

    clearTaskGuidanceStorage();

    expect(readTaskGuidancePendingAction()).toBeNull();
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith(TASK_GUIDANCE_ACTION_STORAGE_KEY);
  });

  it("rejects pending actions for navigation-only task types", () => {
    expect(() => createTaskGuidancePendingAction({
      taskId: "task_nav",
      actionType: "open_dashboard" as any,
      destinationHref: "/dashboard#dashboard-home",
      assignedAt: 100,
    })).toThrow("Task guidance pending actions only support runtime action types.");
  });
});
