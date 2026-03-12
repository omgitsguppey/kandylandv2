"use client";

import { useUI } from "@/context/UIContext";
import { AuthModal } from "@/components/Auth/AuthModal";

export function GlobalAuthModal() {
    const { isAuthModalOpen, authModalMode, closeAuthModal } = useUI();
    return <AuthModal isOpen={isAuthModalOpen} mode={authModalMode} onClose={closeAuthModal} />;
}
