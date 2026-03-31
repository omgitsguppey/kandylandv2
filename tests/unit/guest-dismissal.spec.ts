import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock authFetch from @/lib/authFetch
vi.mock("@/lib/authFetch", async () => {
    return {
        authFetch: vi.fn(),
    };
});

// Mock UI context
vi.mock("@/context/UIContext", async () => {
    return {
        useUI: vi.fn(),
    };
});

// Mock next/dynamic
vi.mock("next/dynamic", () => ({
    default: (fn: any) => {
        // Return a dummy component for testing
        const component = () => null;
        return component;
    },
}));

describe("GlobalAuthModal handleGuestDismiss behavior", () => {
    let authFetchModule: any;
    let uiContextModule: any;
    let GlobalAuthModal: any;

    beforeEach(async () => {
        vi.resetModules();
        authFetchModule = await import("@/lib/authFetch");
        uiContextModule = await import("@/context/UIContext");

        // Default mock for useUI
        uiContextModule.useUI.mockReturnValue({
            isAuthModalOpen: true,
            authModalMode: "signin",
            closeAuthModal: vi.fn(),
        });

        // eslint-disable-next-line @next/next/no-assign-module-variable
        const module = await import("@/components/GlobalAuthModal");
        GlobalAuthModal = module.GlobalAuthModal;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("closes the modal even if authFetch fails", async () => {
        const closeAuthModal = uiContextModule.useUI().closeAuthModal;
        const onDismiss = vi.fn();

        // Mock authFetch failure
        authFetchModule.authFetch.mockRejectedValue(new Error("Network Error"));

        // Spy on console.error
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        // Since we are in a unit test environment (node), we can't easily trigger the event through UI.
        // Instead, we inspect the component's rendered output to get the handler.
        const result = GlobalAuthModal({ onDismiss });
        const handleGuestDismiss = result.props.onClose;

        await handleGuestDismiss();

        expect(onDismiss).toHaveBeenCalled();
        expect(closeAuthModal).toHaveBeenCalled();
        expect(authFetchModule.authFetch).toHaveBeenCalledWith("/api/user/guest-dismissal", { method: "POST" });
        expect(consoleSpy).toHaveBeenCalledWith("Failed to track guest dismissal:", expect.any(Error));

        consoleSpy.mockRestore();
    });

    it("closes the modal and calls onDismiss on success", async () => {
        const closeAuthModal = uiContextModule.useUI().closeAuthModal;
        const onDismiss = vi.fn();

        // Mock authFetch success
        authFetchModule.authFetch.mockResolvedValue({ ok: true });

        const result = GlobalAuthModal({ onDismiss });
        const handleGuestDismiss = result.props.onClose;

        await handleGuestDismiss();

        expect(onDismiss).toHaveBeenCalled();
        expect(closeAuthModal).toHaveBeenCalled();
        expect(authFetchModule.authFetch).toHaveBeenCalled();
    });
});
