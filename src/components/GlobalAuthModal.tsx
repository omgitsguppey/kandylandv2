"use client";

import { useUI } from "@/context/UIContext";
import { AuthModal } from "@/components/Auth/AuthModal";

export function GlobalAuthModal() {
    const { isAuthModalOpen, closeAuthModal } = useUI();
    return <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />;
}
