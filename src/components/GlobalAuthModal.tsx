"use client";

import dynamic from "next/dynamic";

import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import { trackEvent } from "@/lib/telemetry";
import { reportClientIssue } from "@/lib/client-error-reporting";

const AuthModal = dynamic(
    () => import("@/components/Auth/AuthModal").then((mod) => mod.AuthModal),
    { ssr: false },
);

interface GlobalAuthModalProps {
    onDismiss?: () => void;
}

export function GlobalAuthModal({ onDismiss }: GlobalAuthModalProps) {
    const { isAuthModalOpen, authModalMode, closeAuthModal } = useUI();

    const handleGuestDismiss = async () => {
        trackEvent("auth_modal_closed_incomplete", { mode: authModalMode });
        if (onDismiss) onDismiss();
        closeAuthModal();

        try {
            await authFetch("/api/user/guest-dismissal", {
                method: "POST",
            });
        } catch (error) {
            reportClientIssue({
                channel: "runtime",
                severity: "warn",
                message: "Guest dismissal tracking failed",
                error,
                consoleLabel: "[Auth] Failed to track guest dismissal",
            });
        }
    };

    return <AuthModal isOpen={isAuthModalOpen} mode={authModalMode} onClose={handleGuestDismiss} />;
}
