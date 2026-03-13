"use client";

import dynamic from "next/dynamic";

import { useUI } from "@/context/UIContext";

const AuthModal = dynamic(
    () => import("@/components/Auth/AuthModal").then((mod) => mod.AuthModal),
    { ssr: false },
);

export function GlobalAuthModal() {
    const { isAuthModalOpen, authModalMode, closeAuthModal } = useUI();
    return <AuthModal isOpen={isAuthModalOpen} mode={authModalMode} onClose={closeAuthModal} />;
}
