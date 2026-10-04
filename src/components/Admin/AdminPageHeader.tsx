"use client";

import { type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/creative-tim/ui/card";
import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
    title: ReactNode;
    subtitle?: ReactNode;
    eyebrow?: ReactNode;
    actions?: ReactNode;
    topSlot?: ReactNode;
    className?: string;
    contentClassName?: string;
    compact?: boolean;
};

export function AdminPageHeader({
    title, subtitle, eyebrow = "Admin Console", actions, topSlot,
    className, contentClassName, compact = false,
}: AdminPageHeaderProps) {
    return (
        <header className={cn("mb-4 min-w-0", className)}>
            <Card className={cn("min-w-0 rounded-none border-0 bg-transparent py-2 shadow-none", compact ? "gap-3" : "gap-4")}>
                <CardHeader className="min-w-0 px-0">
                    <div className={cn("flex min-w-0 flex-wrap items-start gap-3", contentClassName)}>
                        <div className="min-w-0 flex-[1_1_18rem]">
                            {eyebrow ? <p className="mb-1 text-xs font-medium text-muted-foreground">{eyebrow}</p> : null}
                            <CardTitle><h1 className="break-words text-3xl font-semibold leading-tight tracking-tight text-foreground">{title}</h1></CardTitle>
                            {subtitle ? <CardDescription className="mt-2 max-w-3xl leading-6">{subtitle}</CardDescription> : null}
                        </div>
                        {actions ? <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div> : null}
                    </div>
                </CardHeader>
                {topSlot ? <CardContent className="min-w-0 px-0">{topSlot}</CardContent> : null}
            </Card>
        </header>
    );
}
