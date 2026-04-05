"use client";

import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";

export default function EconomyAdminPage() {
    return (
        <div className="space-y-6">
            <AdminPageHeader
                eyebrow="Marketplace"
                title="Platform Economy"
                subtitle="Work in progress"
            />
            <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-8 text-center sm:p-12">
                <p className="text-gray-500">Work in progress</p>
            </div>
        </div>
    );
}
