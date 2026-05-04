import { describe, expect, it } from "vitest";

import {
  buildDebugEvidenceFingerprint,
  buildDebugEvidenceRecord,
  mapDebugCategoryToAuditDomains,
  redactDebugEvidenceForAudit,
  sanitizeDebugTechnicalDetail,
} from "@/lib/debug-evidence-contract";

describe("debug evidence contract", () => {
  it("deduplicates stable fingerprints from normalized evidence inputs", () => {
    const first = buildDebugEvidenceFingerprint({
      source: "route",
      category: "support",
      route: "admin/support/threads",
      component: "AdminSupportQueue",
      entityType: "support_thread",
      entityId: "thread_1",
      message: "Support thread list failed for admin route.",
    });
    const second = buildDebugEvidenceFingerprint({
      source: "route",
      category: "support",
      route: "admin/support/threads",
      component: "AdminSupportQueue",
      entityType: "support_thread",
      entityId: "thread_1",
      message: "Support thread list failed for admin route.",
    });

    expect(first).toBe(second);
  });

  it("redacts sensitive technical detail from public audit evidence", () => {
    const detail = sanitizeDebugTechnicalDetail({
      body: "private support body",
      Authorization: "Bearer secret",
      status: 403,
      route: "/api/admin/support/threads/thread_1",
    });

    expect(detail.body).toBe("[redacted]");
    expect(detail.Authorization).toBe("[redacted]");
    expect(detail.status).toBe(403);
    expect(detail.route).toBe("/api/admin/support/threads/thread_1");
  });

  it("builds redacted audit summaries and maps support evidence into audit domains", () => {
    const record = buildDebugEvidenceRecord({
      source: "admin",
      severity: "warn",
      category: "support",
      route: "/api/admin/support/threads/thread_1",
      component: "AdminSupportQueue",
      userId: "user_1",
      message: "Support message detail route returned forbidden.",
      humanMessage: "Support message detail route returned forbidden.",
      technicalDetail: { userEmail: "user@example.com" },
    });
    const summary = redactDebugEvidenceForAudit(record);

    expect(summary.fingerprint).toBe(record.fingerprint);
    expect(JSON.stringify(summary)).not.toContain("user_1");
    expect(JSON.stringify(summary)).not.toContain("user@example.com");
    expect(mapDebugCategoryToAuditDomains("support")).toContain("support");
  });
});
