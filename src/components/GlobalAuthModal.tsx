"use client";

import dynamic from "next/dynamic";

import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";

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
        if (onDismiss) onDismiss();
        closeAuthModal();

        try {
            await authFetch("/api/user/guest-dismissal", {
                method: "POST",
            });
        } catch (error) {
            console.error("Failed to track guest dismissal:", error);
        }
    };

    return <AuthModal isOpen={isAuthModalOpen} mode={authModalMode} onClose={handleGuestDismiss} />;
}
