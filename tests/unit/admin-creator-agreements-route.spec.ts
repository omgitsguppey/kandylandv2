import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildDefaultCreatorAgreementTemplate,
} from "@/lib/creator-agreement-documents";

const mockState = vi.hoisted(() => {
  const activeTemplate = {
    templateId: "template_v1",
    agreementVersion: "v1",
    agreementTitle: "Creator Agreement v1",
    agreementSource: "native_full_text" as const,
    activeForNewCreators: true,
    agreementHash: "sha256:v1",
    summaryBullets: ["Summary"],
    createdAt: 1_710_000_000_000,
    createdByUid: "owner_1",
    activatedAt: 1_710_000_000_000,
    activatedByUid: "owner_1",
  };

  return {
    activeTemplate,
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    trackServerEvent: vi.fn(async () => undefined),
    saveCreatorAgreementTemplate: vi.fn(async (template) => template),
    activateCreatorAgreementTemplate: vi.fn(async ({ template }) => ({ ...template, activeForNewCreators: true })),
    getActiveCreatorAgreementTemplate: vi.fn(async () => activeTemplate),
    sendCreatorAgreementDispatch: vi.fn(async () => ({
      template: activeTemplate,
      dispatch: {
        dispatchId: "dispatch_1",
        userId: "creator_1",
        agreementVersion: "v1",
        templateId: "template_v1",
        agreementHash: "sha256:v1",
        sentAt: 1_710_000_010_000,
        sentByUid: "admin_1",
        deliveryMethod: "in_app",
        status: "sent",
      },
      after: {
        userId: "creator_1",
        contractVersion: "v1",
        agreementHash: "sha256:v1",
      },
    })),
    countersignCreatorAgreementDispatch: vi.fn(async () => ({
      template: activeTemplate,
      dispatch: {
        dispatchId: "dispatch_1",
        userId: "creator_1",
        agreementVersion: "v1",
        templateId: "template_v1",
        agreementHash: "sha256:v1",
        sentAt: 1_710_000_010_000,
        sentByUid: "admin_1",
        deliveryMethod: "in_app",
        status: "signed",
      },
      signature: {
        dispatchId: "dispatch_1",
        userId: "creator_1",
        agreementVersion: "v1",
        templateId: "template_v1",
        agreementHash: "sha256:v1",
        signerUid: "admin_1",
        signerName: "admin@example.com",
        signedAt: 1_710_000_020_000,
        acknowledgementValues: {},
      },
      after: {
        userId: "creator_1",
        adminSignatureStatus: "signature_signed",
      },
    })),
    isOwner: true,
    reset() {
      this.guardApiRequest.mockReset();
      this.handleApiError.mockReset();
      this.trackServerEvent.mockClear();
      this.saveCreatorAgreementTemplate.mockClear();
      this.activateCreatorAgreementTemplate.mockClear();
      this.getActiveCreatorAgreementTemplate.mockClear();
      this.sendCreatorAgreementDispatch.mockClear();
      this.countersignCreatorAgreementDispatch.mockClear();
      this.isOwner = true;
    },
  };
});

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN: {},
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {},
  adminStorage: null,
}));

vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/creator-admin", () => ({
  isCreatorOwnerEmail: () => mockState.isOwner,
}));

vi.mock("@/lib/server/creator-agreement-templates", () => ({
  getActiveCreatorAgreementTemplate: mockState.getActiveCreatorAgreementTemplate,
  saveCreatorAgreementTemplate: mockState.saveCreatorAgreementTemplate,
  activateCreatorAgreementTemplate: mockState.activateCreatorAgreementTemplate,
}));

vi.mock("@/lib/server/creator-agreement-documents", () => ({
  sendCreatorAgreementDispatch: mockState.sendCreatorAgreementDispatch,
  countersignCreatorAgreementDispatch: mockState.countersignCreatorAgreementDispatch,
}));

import { GET, POST } from "@/app/api/admin/creator-agreements/route";

function buildTemplateForm(action: string) {
  const form = new FormData();
  form.set("action", action);
  form.set("agreementVersion", "v2.0");
  form.set("agreementTitle", "Creator Agreement v2");
  form.set("agreementSource", "native_full_text");
  return form;
}

describe("/api/admin/creator-agreements", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({
      uid: "admin_1",
      email: "owner@example.com",
    });
    mockState.handleApiError.mockImplementation((error: Error) => NextResponse.json({
      error: error.message,
    }, { status: 500 }));
  });

  it("returns the active agreement template without storage paths", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/creator-agreements"));
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(200);
    expect(payload.activeTemplate).toMatchObject({
      agreementVersion: "v1",
      agreementHashAvailable: true,
    });
    expect(payload.activeTemplate).not.toHaveProperty("pdfStoragePath");
  });

  it("lets owners create and activate active templates", async () => {
    const request = new NextRequest("http://localhost/api/admin/creator-agreements", {
      method: "POST",
      body: buildTemplateForm("activate_template"),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(200);
    expect(payload.success).toBe(true);
    expect(mockState.activateCreatorAgreementTemplate).toHaveBeenCalledWith(expect.objectContaining({
      template: expect.objectContaining({
        agreementVersion: "v2.0",
        agreementHash: buildDefaultCreatorAgreementTemplate().agreementHash,
      }),
      activatedByUid: "admin_1",
    }));
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_creator_agreement_template_activated", expect.objectContaining({
      actorType: "owner_admin",
      performedAs: "owner_override",
    }), "admin_1");
  });

  it("blocks non-owner admins from activating the active template", async () => {
    mockState.isOwner = false;

    const response = await POST(new NextRequest("http://localhost/api/admin/creator-agreements", {
      method: "POST",
      body: buildTemplateForm("activate_template"),
    }));
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(403);
    expect(payload.error).toContain("Only the primary owner");
  });

  it("sends updated agreements with actor-marked telemetry", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/creator-agreements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "send_updated_agreement",
        targetUserId: "creator_1",
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockState.sendCreatorAgreementDispatch).toHaveBeenCalledWith(expect.objectContaining({
      targetUserId: "creator_1",
      sendUpdatedAgreement: true,
    }));
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_creator_agreement_update_sent", expect.objectContaining({
      actorType: "owner_admin",
      targetUserId: "creator_1",
      performedAs: "admin_on_behalf",
      agreement_hash: "sha256:v1",
    }), "creator_1");
  });
});
