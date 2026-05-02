"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { useAdminViewAs } from "@/context/AdminViewAsContext";
import type { SyntheticCreatorType } from "@/lib/admin/synthetic-creators-view-as";

type AdminCreatorViewAsControlsProps = {
  targetUserId: string;
  displayName: string;
  username?: string;
  syntheticCreatorType?: SyntheticCreatorType;
};

export function AdminCreatorViewAsControls({
  targetUserId,
  displayName,
  username,
  syntheticCreatorType,
}: AdminCreatorViewAsControlsProps) {
  const { viewAsState, startViewAsCreator, endViewAsCreator } = useAdminViewAs();
  const [reason, setReason] = useState("Admin roster QA");
  const [saving, setSaving] = useState(false);
  const isViewingThisCreator = viewAsState?.adminViewingAsUserId === targetUserId;
  const profileHref = username ? `/creators/${encodeURIComponent(username)}` : "";

  const handleStart = async () => {
    try {
      setSaving(true);
      await startViewAsCreator({
        targetUserId,
        targetDisplayName: displayName,
        reason,
        returnHref: `/admin/roster?focus=${encodeURIComponent(targetUserId)}`,
        syntheticCreatorType,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "View-as session could not start.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 sm:w-auto">
      <div className="flex flex-wrap items-center gap-2">
        {profileHref ? (
          <Link href={profileHref} className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white">
            View fan profile
          </Link>
        ) : null}
        {isViewingThisCreator ? (
          <button
            type="button"
            onClick={() => void endViewAsCreator("Return from roster")}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-black"
          >
            <RotateCcw className="h-4 w-4" />
            Return to admin
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={saving || reason.trim().length < 4}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand-purple px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            <Eye className="h-4 w-4" />
            {saving ? "Starting..." : "View as creator"}
          </button>
        )}
      </div>
      {!isViewingThisCreator ? (
        <label className="mt-3 block">
          <span className="sr-only">View-as reason</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="QA reason"
            className="w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-brand-purple/60"
          />
        </label>
      ) : null}
    </div>
  );
}
