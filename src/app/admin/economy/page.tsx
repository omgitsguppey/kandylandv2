"use client";

import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";

import { PlatformEconomyConsole } from "./components/PlatformEconomyConsole";

export default function EconomyAdminPage() {
    return (
        <div className="space-y-3 md:space-y-4">
            <AdminPageHeader
                eyebrow="Platform Economy"
                title="GumDrops Commerce Control Center"
                subtitle="Canonical treasury, package, promo, offer, redemption, warning, and drift truth for anything GumDrops touches."
                compact
            />
            <PlatformEconomyConsole />
        </div>
    );
}
