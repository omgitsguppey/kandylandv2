import { describe, expect, it } from "vitest";
import {
    buildSupportThreadKey,
    describeSupportState,
    describeSupportStateDetail,
    formatSupportCategoryLabel,
    getSupportPrimaryHandle,
    normalizeSupportThreadCategory,
    normalizeSupportThreadStatus,
} from "@/lib/support-readiness";

describe("getSupportPrimaryHandle", () => {
    it("returns @handle if handle is present", () => {
        expect(getSupportPrimaryHandle({ handle: "johndoe", email: "john@example.com", displayName: "John Doe" })).toBe("@johndoe");
        expect(getSupportPrimaryHandle({ handle: "johndoe" })).toBe("@johndoe");
    });

    it("returns email if handle is missing but email is present", () => {
        expect(getSupportPrimaryHandle({ email: "john@example.com", displayName: "John Doe" })).toBe("john@example.com");
        expect(getSupportPrimaryHandle({ email: "john@example.com" })).toBe("john@example.com");
        expect(getSupportPrimaryHandle({ handle: null, email: "john@example.com" })).toBe("john@example.com");
    });

    it("returns displayName if handle and email are missing but displayName is present", () => {
        expect(getSupportPrimaryHandle({ displayName: "John Doe" })).toBe("John Doe");
        expect(getSupportPrimaryHandle({ handle: null, email: null, displayName: "John Doe" })).toBe("John Doe");
    });

    it("returns 'Anonymous User' if handle, email, and displayName are all missing or null", () => {
        expect(getSupportPrimaryHandle({})).toBe("Anonymous User");
        expect(getSupportPrimaryHandle({ handle: null, email: null, displayName: null })).toBe("Anonymous User");
    });
});

describe("describeSupportState", () => {
    it("returns 'Needs Attention' for 'open'", () => {
        expect(describeSupportState("open")).toBe("Waiting on Support");
    });

    it("returns 'Waiting on Support' for 'waiting_on_support'", () => {
        expect(describeSupportState("waiting_on_support")).toBe("Waiting on Support");
        expect(describeSupportState("pending")).toBe("Waiting on Support");
    });

    it("returns 'Waiting on User' for 'waiting_on_user'", () => {
        expect(describeSupportState("waiting_on_user")).toBe("Waiting on User");
    });

    it("returns 'Resolved' for 'resolved' and 'closed'", () => {
        expect(describeSupportState("resolved")).toBe("Resolved");
        expect(describeSupportState("closed")).toBe("Resolved");
    });

    it("returns 'Ready' for 'ready' and 'Open' for unexpected values", () => {
        expect(describeSupportState("ready")).toBe("Ready");
        expect(describeSupportState("anything" as any)).toBe("Open");
    });
});

describe("describeSupportStateDetail", () => {
    it("describes waiting on support truthfully", () => {
        expect(describeSupportStateDetail("waiting_on_support")).toContain("waiting on a support reply");
    });

    it("describes waiting on user truthfully", () => {
        expect(describeSupportStateDetail("waiting_on_user")).toContain("belongs to the user");
    });
});

describe("normalizeSupportThreadStatus", () => {
    it("returns 'open' for 'open' or mixed case variants", () => {
        expect(normalizeSupportThreadStatus("open")).toBe("open");
        expect(normalizeSupportThreadStatus("OPEN")).toBe("open");
        expect(normalizeSupportThreadStatus("OpEn")).toBe("open");
    });

    it("returns 'pending' for 'pending' or mixed case variants", () => {
        expect(normalizeSupportThreadStatus("pending")).toBe("pending");
        expect(normalizeSupportThreadStatus("PENDING")).toBe("pending");
        expect(normalizeSupportThreadStatus("pEnDiNg")).toBe("pending");
    });

    it("returns 'closed' for 'closed' or mixed case variants", () => {
        expect(normalizeSupportThreadStatus("closed")).toBe("closed");
        expect(normalizeSupportThreadStatus("CLOSED")).toBe("closed");
        expect(normalizeSupportThreadStatus("cLoSeD")).toBe("closed");
    });

    it("returns 'open' for invalid strings", () => {
        expect(normalizeSupportThreadStatus("ready")).toBe("open");
        expect(normalizeSupportThreadStatus("")).toBe("open");
        expect(normalizeSupportThreadStatus("unknown")).toBe("open");
    });

    it("returns 'open' for non-string inputs", () => {
        expect(normalizeSupportThreadStatus(null)).toBe("open");
        expect(normalizeSupportThreadStatus(undefined)).toBe("open");
        expect(normalizeSupportThreadStatus(123)).toBe("open");
        expect(normalizeSupportThreadStatus({})).toBe("open");
        expect(normalizeSupportThreadStatus([])).toBe("open");
    });
});

describe("normalizeSupportThreadCategory", () => {
    it("normalizes known category values", () => {
        expect(normalizeSupportThreadCategory("technical")).toBe("technical");
        expect(normalizeSupportThreadCategory("billing")).toBe("billing");
        expect(normalizeSupportThreadCategory("creator_application")).toBe("creator_application");
        expect(normalizeSupportThreadCategory("account")).toBe("account");
    });

    it("falls back to general for unknown values", () => {
        expect(normalizeSupportThreadCategory("unknown")).toBe("general");
        expect(normalizeSupportThreadCategory(null)).toBe("general");
    });
});

describe("formatSupportCategoryLabel", () => {
    it("renders human readable labels", () => {
        expect(formatSupportCategoryLabel("creator_application")).toBe("Creator application");
        expect(formatSupportCategoryLabel("technical")).toBe("Technical");
    });
});

describe("buildSupportThreadKey", () => {

    it("returns an empty user identity when missing arguments", () => {
        expect(buildSupportThreadKey(undefined as unknown as string)).toBe("support:undefined");
    });

    it("returns a correctly formatted key for a standard user ID", () => {
        expect(buildSupportThreadKey("123")).toBe("support:123");
    });

    it("returns a correctly formatted key for an alphanumeric user ID", () => {
        expect(buildSupportThreadKey("abcDEF456")).toBe("support:abcDEF456");
    });

    it("returns a correctly formatted key for an empty string", () => {
        expect(buildSupportThreadKey("")).toBe("support:");
    });

    it("handles user IDs with special characters", () => {
        expect(buildSupportThreadKey("user-id_123.test")).toBe("support:user-id_123.test");
    });
});
