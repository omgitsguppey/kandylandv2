"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useAuthIdentity, useUserProfile } from "@/context/AuthContext";
import { readPreferredAuthenticatedPath } from "@/lib/navigation-persistence";
import { cn } from "@/lib/utils";

interface LegalBackLinkProps {
    className?: string;
    signedInLabel?: string;
    signedOutLabel?: string;
    variant?: "inline" | "button";
}

export function LegalBackLink({
    className,
    signedInLabel = "Back to App",
    signedOutLabel = "Back to Home",
    variant = "inline",
}: LegalBackLinkProps) {
    const { user } = useAuthIdentity();
    const { userProfile } = useUserProfile();

    const href = user
        ? readPreferredAuthenticatedPath(userProfile?.role ?? "user")
        : "/";
    const label = user ? signedInLabel : signedOutLabel;

    return (
        <Link
            href={href}
            className={cn(
                variant === "button"
                    ? "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-brand-purple px-8 py-4 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 transition-all active:scale-95 hover:text-white"
                    : "inline-flex items-center gap-2 text-sm font-semibold text-brand-purple transition-colors hover:text-white",
                className,
            )}
        >
            <ArrowLeft className="h-4 w-4" />
            {label}
        </Link>
    );
}
