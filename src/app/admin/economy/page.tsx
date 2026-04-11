"use client";

import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";

export default function EconomyAdminPage() {
    return (
        <div className="space-y-4 md:space-y-5">
            <AdminPageHeader
                eyebrow="Marketplace"
                title="Platform Economy"
                subtitle="Economy controls are still being condensed."
                compact
            />
            <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-8 text-center sm:p-12">
                <p className="text-gray-500">Work in progress</p>
            </div>
        </div>
    );
}
