import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getClientSessionId,
  getClientSubjectId,
  syncClientSessionOwnership,
} from "@/lib/client-session";

type StorageMock = {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
};

function createStorageMock() {
  const store: Record<string, string> = {};
  const storage: StorageMock = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };

  return { store, storage };
}

describe("client-session", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:34:56Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses crypto.randomUUID when available for client session IDs", () => {
    const { storage: localStorage } = createStorageMock();
    const { storage: sessionStorage } = createStorageMock();

    vi.stubGlobal("window", { localStorage, sessionStorage });
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "secure-uuid"),
    });

    const sessionId = getClientSessionId();

    expect(sessionId).toBe("sess_secure-uuid");
    expect(sessionStorage.setItem).toHaveBeenCalledWith("kandy_session_id", "sess_secure-uuid");
  });

  it("falls back to crypto.getRandomValues without touching Math.random", () => {
    const { storage: localStorage } = createStorageMock();
    const { storage: sessionStorage } = createStorageMock();
    const mathRandom = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random should never be used for session identifiers.");
    });

    vi.stubGlobal("window", { localStorage, sessionStorage });
    vi.stubGlobal("crypto", {
      getRandomValues: vi.fn((buffer: Uint8Array) => {
        buffer.set([
          0x00, 0x11, 0x22, 0x33,
          0x44, 0x55, 0x66, 0x77,
          0x88, 0x99, 0xaa, 0xbb,
          0xcc, 0xdd, 0xee, 0xff,
        ]);
        return buffer;
      }),
    });

    const timeFragment = Date.now().toString(36);
    const sessionId = getClientSessionId();

    expect(sessionId).toBe(`sess_${timeFragment}_00112233445566778899aabbccddeeff`);
    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      "kandy_session_id",
      `sess_${timeFragment}_00112233445566778899aabbccddeeff`,
    );
    expect(mathRandom).not.toHaveBeenCalled();
  });

  it("rotates the session when a different authenticated owner takes over", () => {
    const { store: sessionStore, storage: sessionStorage } = createStorageMock();
    const { storage: localStorage } = createStorageMock();
    sessionStore.kandy_session_id = "sess_existing";
    sessionStore["kandydrops.clientSessionOwner"] = "user:first";

    vi.stubGlobal("window", { localStorage, sessionStorage });
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "rotated-secure-uuid"),
    });

    syncClientSessionOwnership("user:second");

    expect(sessionStore.kandy_session_id).toBe("sess_rotated-secure-uuid");
    expect(sessionStore["kandydrops.clientSessionOwner"]).toBe("user:second");
  });

  it("stores the subject ID in both persistent and session storage", () => {
    const { store: localStore, storage: localStorage } = createStorageMock();
    const { store: sessionStore, storage: sessionStorage } = createStorageMock();

    vi.stubGlobal("window", { localStorage, sessionStorage });
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "subject-uuid"),
    });

    const subjectId = getClientSubjectId();

    expect(subjectId).toBe("subject_subject-uuid");
    expect(localStore["kandydrops.clientSubject"]).toBe("subject_subject-uuid");
    expect(sessionStore["kandydrops.clientSubject"]).toBe("subject_subject-uuid");
  });

  it("throws when no cryptographically secure randomness is available", () => {
    const { storage: localStorage } = createStorageMock();
    const { storage: sessionStorage } = createStorageMock();

    vi.stubGlobal("window", { localStorage, sessionStorage });
    vi.stubGlobal("crypto", {});

    expect(() => getClientSessionId()).toThrow(
      "Cryptographically secure random number generation is not available in this environment.",
    );
  });
});
