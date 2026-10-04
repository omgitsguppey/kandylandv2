"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { UserSettingsPage } from "@/components/Settings/UserSettingsPage";
import { buttonVariants } from "@/components/ui/Button";

export function KandyAccountCenter() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 text-foreground sm:py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 sm:mb-8">
        <div className="min-w-0 flex-1 basis-80 break-words">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Account settings</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Manage your profile, notifications, privacy, and account access.</p>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline", className: "max-w-full min-w-0 gap-2" })}>
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">My KandyDrops</span>
        </Link>
      </header>
      <UserSettingsPage />
    </div>
  );
}
