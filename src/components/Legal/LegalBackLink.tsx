"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useAuthIdentity, useUserProfile } from "@/context/AuthContext";
import { readLastVisitedPath } from "@/lib/navigation-persistence";

export function LegalBackLink() {
    const { user } = useAuthIdentity();
    const { userProfile } = useUserProfile();

    const href = user
        ? userProfile?.role === "admin"
            ? "/admin"
            : readLastVisitedPath() || "/dashboard"
        : "/";
    const label = user ? "Back to App" : "Back to Home";

    return (
        <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-purple transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            {label}
        </Link>
    );
}
