"use client";

import { Button } from "@/components/ui/Button";


import { RotateCcw } from "lucide-react";

import { useAdminViewAs } from "@/context/AdminViewAsContext";

export function AdminViewAsBanner() {
  const { viewAsState, endViewAsCreator } = useAdminViewAs();

  if (!viewAsState) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[80] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-background/95 px-4 py-3 shadow-2xl shadow-scrim/50 md:bottom-auto md:top-4"
      data-admin-view-as-banner="true"
      role="status"
    >
      <p className="min-w-0 text-sm font-semibold text-foreground">
        Viewing as <span className="text-primary">{viewAsState.adminViewingAsDisplayName}</span>.
      </p>
      <Button variant="ghost"
        type="button"
        onClick={() => void endViewAsCreator("Return to admin")}
        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background"
        aria-label="Return to admin"
      >
        <RotateCcw className="h-4 w-4" />
        Return to admin
      </Button>
    </div>
  );
}
