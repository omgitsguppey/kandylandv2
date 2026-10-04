"use client";

import type { ReactNode } from "react";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";

type AdminControlTowerLandingProps = {
    children: ReactNode;
    evidenceStatus: ReactNode;
    fixtureNotice?: ReactNode;
    subtitle: string;
    truthLabel: string;
};

export function AdminControlTowerLanding({ children, evidenceStatus, fixtureNotice, subtitle, truthLabel }: AdminControlTowerLandingProps) {
    return (
        <section className="min-w-0 max-w-full space-y-6 md:space-y-8" data-admin-control-tower-landing="true">
            <AdminPageHeader compact eyebrow={null} title="Platform overview" subtitle={subtitle} actions={evidenceStatus}
                topSlot={<p className="break-words text-sm text-muted-foreground">{truthLabel}</p>} />
            {fixtureNotice}
            {children}
        </section>
    );
}
