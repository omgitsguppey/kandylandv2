"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useAuthIdentity, useUserProfile } from "@/context/AuthContext";
import { getPreferredAuthenticatedPathForProfile } from "@/lib/creator-application";
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
        ? getPreferredAuthenticatedPathForProfile(userProfile, user.uid)
        : "/";
    const label = user ? signedInLabel : signedOutLabel;

    return (
        <Link
            href={href}
            className={cn(
                variant === "button"
                    ? "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-brand-purple/40 bg-gradient-to-r from-brand-purple to-brand-purple px-8 py-3 text-sm font-bold text-white shadow-lg shadow-brand-purple/20 transition-all hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-95"
                    : "inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-brand-purple transition-colors hover:bg-brand-purple/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                className,
            )}
        >
            <ArrowLeft className="h-4 w-4" />
            {label}
        </Link>
    );
}
