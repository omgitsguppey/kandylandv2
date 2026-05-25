import { describe, expect, it } from "vitest";

import { MAJOR_SURFACE_PARITY_IDS } from "@/lib/parity/surface-parity-contract";
import {
  ROLE_PERMISSION_IDS,
  ROLE_PERMISSION_ROLES,
  validateRolePermissionRegistry,
} from "@/lib/parity/role-permission-contract";
import {
  ROLE_PERMISSION_REGISTRY,
  buildPermissionTelemetry,
  buildRolePermissionParityReport,
  canUseAction,
  canViewSurface,
  explainPermissionMismatch,
  resolveDeniedState,
} from "@/lib/parity/role-permission-resolver";

describe("role permission parity", () => {
  it("registers every major surface with every role and required permission", () => {
    expect(ROLE_PERMISSION_REGISTRY.map((surface) => surface.surfaceId).sort()).toEqual(
      [...MAJOR_SURFACE_PARITY_IDS].sort(),
    );
    expect(validateRolePermissionRegistry(ROLE_PERMISSION_REGISTRY)).toEqual([]);

    for (const surface of ROLE_PERMISSION_REGISTRY) {
      for (const role of ROLE_PERMISSION_ROLES) {
        expect(surface.roles[role], `${surface.surfaceId} missing ${role}`).toBeTruthy();
      }
      for (const permission of ROLE_PERMISSION_IDS) {
        expect(surface.permissions[permission], `${surface.surfaceId} missing ${permission}`).toBeTruthy();
      }
      expect(surface.deniedState.copy.title).toBeTruthy();
      expect(surface.deniedState.cta.label).toBeTruthy();
      expect(surface.telemetry.permissionDenied).toMatch(/permission_denied$/u);
      expect(surface.telemetry.roleSurfaceMismatch).toMatch(/role_surface_mismatch$/u);
      expect(surface.debugLane).toBe("Role parity");
      expect(surface.scoreDimensionImpact.before).toBeTruthy();
      expect(surface.scoreDimensionImpact.after).toBeTruthy();
    }
  });

  it("blocks creator-only surfaces and actions for plain users with copy, CTA, and telemetry", () => {
    expect(canViewSurface({ role: "user", surfaceId: "creator_settings" }).allowed).toBe(false);
    expect(canUseAction({ role: "user", surfaceId: "creator_settings", permission: "mutate_settings" }).allowed).toBe(false);

    const denied = resolveDeniedState({
      role: "user",
      surfaceId: "creator_settings",
      permission: "mutate_settings",
      reason: "plain_user_on_creator_settings",
    });

    expect(denied.copy.title).toBe("Creator access required");
    expect(denied.cta.action).toBe("open_dashboard");
    expect(denied.safeFingerprint).toBe("plain_user_on_creator_settings");
    expect(denied.telemetry.eventName).toBe("creator_settings_permission_denied");
    expect(denied.telemetry.params.permission).toBe("mutate_settings");
    expect(explainPermissionMismatch({ role: "user", surfaceId: "creator_settings" })).toContain("creator account");
  });

  it("keeps admin internals admin-only and treats system as non-UI automation", () => {
    expect(canViewSurface({ role: "guest", surfaceId: "admin_debug" }).allowed).toBe(false);
    expect(canViewSurface({ role: "creator", surfaceId: "admin_debug" }).allowed).toBe(false);
    expect(canViewSurface({ role: "admin", surfaceId: "admin_debug" }).allowed).toBe(true);

    const systemAccess = canUseAction({
      role: "system",
      surfaceId: "admin_debug",
      permission: "view_admin_truth",
    });
    expect(systemAccess.allowed).toBe(true);
    expect(systemAccess.visibility).toBe("service_only");
  });

  it("preserves Account Settings and Creator Settings as separate role surfaces", () => {
    expect(canViewSurface({ role: "user", surfaceId: "account_settings" }).allowed).toBe(true);
    expect(canViewSurface({ role: "user", surfaceId: "creator_settings" }).allowed).toBe(false);
    expect(canViewSurface({ role: "creator", surfaceId: "account_settings" }).allowed).toBe(true);
    expect(canViewSurface({ role: "creator", surfaceId: "creator_settings" }).allowed).toBe(true);
  });

  it("builds permission telemetry and report evidence without production reads", () => {
    const telemetry = buildPermissionTelemetry({
      role: "guest",
      surfaceId: "wallet_purchase_modal",
      permission: "view_user_wallet",
      outcome: "permission_denied",
      reason: "auth_required",
    });

    expect(telemetry.eventName).toBe("wallet_purchase_modal_permission_denied");
    expect(telemetry.params.safeFingerprint).toBe("auth_required");
    expect(telemetry.params.surfaceId).toBe("wallet_purchase_modal");

    const report = buildRolePermissionParityReport({
      currentHead: "test-head",
      dirtyFiles: ["src/lib/parity/role-permission-contract.ts"],
    });
    expect(report.status).toBe("pass");
    expect(report.productionReadsPerformed).toBe(false);
    expect(report.providerCallsPerformed).toBe(false);
    expect(report.validationFailures).toEqual([]);
    expect(report.debugLane.leakedControlFindings).toEqual([]);
    expect(report.scoreDimensionBeforeAfter.before).toBeTruthy();
    expect(report.scoreDimensionBeforeAfter.after).toBeTruthy();
  });
});
