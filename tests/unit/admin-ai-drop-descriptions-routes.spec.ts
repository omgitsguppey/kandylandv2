import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    getErrorMessage: vi.fn(),
    recordRouteRuntimeSample: vi.fn(),
    buildAdminAiDropDescriptionDashboard: vi.fn(),
    saveAdminAiDropDescriptionSettings: vi.fn(),
    generateAdminAiDropDescription: vi.fn(),
    updateAdminAiDropDescriptionFeedback: vi.fn(),
    saveAdminAiDropDescriptionPromptPolicy: vi.fn(),
    toAdminAiDropDescriptionClientError: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.handleApiError.mockReset();
        this.getErrorMessage.mockReset();
        this.recordRouteRuntimeSample.mockReset();
        this.buildAdminAiDropDescriptionDashboard.mockReset();
        this.saveAdminAiDropDescriptionSettings.mockReset();
        this.generateAdminAiDropDescription.mockReset();
        this.updateAdminAiDropDescriptionFeedback.mockReset();
        this.saveAdminAiDropDescriptionPromptPolicy.mockReset();
        this.toAdminAiDropDescriptionClientError.mockReset();
    },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
    getErrorMessage: mockState.getErrorMessage,
}));
vi.mock("@/lib/server/route-runtime-health", () => ({
    recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN_AI_CONTROL: {},
    ADMIN_AI_DASHBOARD_READ: {},
}));
vi.mock("@/lib/server/ai-drop-descriptions", () => ({
    buildAdminAiDropDescriptionDashboard: mockState.buildAdminAiDropDescriptionDashboard,
    saveAdminAiDropDescriptionSettings: mockState.saveAdminAiDropDescriptionSettings,
    generateAdminAiDropDescription: mockState.generateAdminAiDropDescription,
    updateAdminAiDropDescriptionFeedback: mockState.updateAdminAiDropDescriptionFeedback,
    saveAdminAiDropDescriptionPromptPolicy: mockState.saveAdminAiDropDescriptionPromptPolicy,
    toAdminAiDropDescriptionClientError: mockState.toAdminAiDropDescriptionClientError,
}));

import { GET as getDashboard, PUT as putSettings } from "@/app/api/admin/ai/drop-descriptions/route";
import { POST as postGenerate } from "@/app/api/admin/ai/drop-descriptions/generate/route";
import { POST as postFeedback } from "@/app/api/admin/ai/drop-descriptions/feedback/route";
import { PUT as putPromptPolicy } from "@/app/api/admin/ai/drop-descriptions/prompt-policy/route";

describe("admin ai drop description routes", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            email: "admin@example.com",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
        mockState.getErrorMessage.mockImplementation((error: unknown) => error instanceof Error ? error.message : String(error));
        mockState.toAdminAiDropDescriptionClientError.mockReturnValue(null);
    });

    it("reads the description dashboard and updates settings", async () => {
        mockState.buildAdminAiDropDescriptionDashboard.mockResolvedValue({
            refreshedAtMs: 1,
            settings: { enabled: true, model: "gemini-2.5-flash-lite" },
            runtime: { status: "ready" },
            aggregate: {},
            recentJobs: [],
            promptPolicy: { version: 1 },
            promptPolicyHistory: [],
            reviewGallery: [],
        });
        mockState.saveAdminAiDropDescriptionSettings.mockResolvedValue({
            enabled: true,
            model: "gemini-2.5-flash-lite",
        });

        const getResponse = await getDashboard(new NextRequest("http://localhost/api/admin/ai/drop-descriptions"));
        const getBody = await getResponse.json();
        expect(getResponse.status).toBe(200);
        expect(getBody.settings.model).toBe("gemini-2.5-flash-lite");

        const putResponse = await putSettings(new NextRequest("http://localhost/api/admin/ai/drop-descriptions", {
            method: "PUT",
            body: JSON.stringify({ enabled: true, optimizerEnabled: true }),
            headers: { "Content-Type": "application/json" },
        }));
        expect(putResponse.status).toBe(200);
        expect(mockState.saveAdminAiDropDescriptionSettings).toHaveBeenCalledWith({
            enabled: true,
            model: undefined,
            optimizerEnabled: true,
            actorUid: "admin_1",
            actorEmail: "admin@example.com",
        });
    });

    it("generates descriptions and forwards feedback", async () => {
        mockState.generateAdminAiDropDescription.mockResolvedValue({
            id: "job_1",
            title: "Creator | Flavor",
        });
        mockState.updateAdminAiDropDescriptionFeedback.mockResolvedValue({
            id: "job_1",
            feedback: "liked",
        });

        const generateResponse = await postGenerate(new NextRequest("http://localhost/api/admin/ai/drop-descriptions/generate", {
            method: "POST",
            body: JSON.stringify({
                title: "Creator | Flavor",
                creatorId: "creator_1",
                creatorName: "Creator",
                draftSessionId: "draft_1",
            }),
            headers: { "Content-Type": "application/json" },
        }));
        expect(generateResponse.status).toBe(200);
        expect(mockState.generateAdminAiDropDescription).toHaveBeenCalledWith({
            title: "Creator | Flavor",
            creatorId: "creator_1",
            creatorName: "Creator",
            dropId: null,
            draftSessionId: "draft_1",
            previousJobId: null,
            requestedByUid: "admin_1",
            requestedByEmail: "admin@example.com",
        });

        const feedbackResponse = await postFeedback(new NextRequest("http://localhost/api/admin/ai/drop-descriptions/feedback", {
            method: "POST",
            body: JSON.stringify({
                jobId: "job_1",
                action: "like",
            }),
            headers: { "Content-Type": "application/json" },
        }));
        expect(feedbackResponse.status).toBe(200);
        expect(mockState.updateAdminAiDropDescriptionFeedback).toHaveBeenCalledWith({
            jobId: "job_1",
            action: "like",
            dropId: null,
            actorUid: "admin_1",
            actorEmail: "admin@example.com",
        });
    });

    it("saves the prompt policy workbench", async () => {
        mockState.saveAdminAiDropDescriptionPromptPolicy.mockResolvedValue({
            version: 2,
            currentMutablePrompt: "fresh mutable prompt",
        });

        const response = await putPromptPolicy(new NextRequest("http://localhost/api/admin/ai/drop-descriptions/prompt-policy", {
            method: "PUT",
            body: JSON.stringify({
                baseInstructionPrompt: "base",
                lockedClauses: ["locked"],
                mutableClauses: ["mutable"],
                currentMutablePrompt: "fresh mutable prompt",
                autoOptimize: true,
            }),
            headers: { "Content-Type": "application/json" },
        }));
        expect(response.status).toBe(200);
        expect(mockState.saveAdminAiDropDescriptionPromptPolicy).toHaveBeenCalledWith({
            actorUid: "admin_1",
            actorEmail: "admin@example.com",
            baseInstructionPrompt: "base",
            lockedClauses: ["locked"],
            mutableClauses: ["mutable"],
            currentMutablePrompt: "fresh mutable prompt",
            autoOptimize: true,
        });
    });
});
