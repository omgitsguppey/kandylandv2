"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";


import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Eye, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { useAdminViewAs } from "@/context/AdminViewAsContext";
import { useAuth } from "@/context/AuthContext";
import type { SyntheticCreatorType } from "@/lib/admin/synthetic-creators-view-as";
import {
  buildCreatorProfileLinkTelemetryPayload,
  buildCreatorPublicHref,
  explainCreatorProfileRouteMissing,
} from "@/lib/creator-profile-routing";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import { trackEvent } from "@/lib/telemetry";

type AdminCreatorViewAsControlsProps = {
  targetUserId: string;
  displayName: string;
  username?: string;
  syntheticCreatorType?: SyntheticCreatorType;
};

function getAdminViewAsSafeErrorMessage(error: unknown) {
  return sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable").operatorMessage;
}

export function AdminCreatorViewAsControls({
  targetUserId,
  displayName,
  username,
  syntheticCreatorType,
}: AdminCreatorViewAsControlsProps) {
  const { viewAsState, startViewAsCreator, endViewAsCreator } = useAdminViewAs();
  const { user, userProfile } = useAuth();
  const [reason, setReason] = useState("Admin roster QA");
  const [saving, setSaving] = useState(false);
  const missingRouteTelemetryKeyRef = useRef("");
  const isViewingThisCreator = viewAsState?.adminViewingAsUserId === targetUserId;
  const profileRouteInput = useMemo(() => ({
    uid: targetUserId,
    creatorId: targetUserId,
    username,
    creatorUsername: username,
    isSyntheticCreator: Boolean(syntheticCreatorType),
  }), [syntheticCreatorType, targetUserId, username]);
  const profileHref = buildCreatorPublicHref(profileRouteInput) ?? "";
  const missingProfileReason = profileHref ? "" : explainCreatorProfileRouteMissing(profileRouteInput);
  const actor = useMemo(() => ({
    uid: user?.uid ?? "",
    email: user?.email ?? "",
    role: userProfile?.role ?? (user ? "admin" : "guest"),
    isAdmin: userProfile?.role === "admin",
  }), [user, userProfile?.role]);

  useEffect(() => {
    if (!missingProfileReason) {
      return;
    }

    const telemetryKey = `${targetUserId}:${missingProfileReason}`;
    if (missingRouteTelemetryKeyRef.current === telemetryKey) {
      return;
    }

    missingRouteTelemetryKeyRef.current = telemetryKey;
    trackEvent("creator_profile_link_missing", buildCreatorProfileLinkTelemetryPayload({
      actor,
      creator: profileRouteInput,
      href: null,
      routeSource: "admin_roster",
      currentRoute: "/admin/roster",
      missingReason: missingProfileReason,
    }));
  }, [actor, missingProfileReason, profileRouteInput, targetUserId]);

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
      toast.error(getAdminViewAsSafeErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-border bg-background/20 p-3 sm:w-auto">
      <div className="flex flex-wrap items-center gap-2">
        {profileHref ? (
          <Link
            href={profileHref}
            onClick={() => {
              trackEvent("creator_profile_link_clicked", buildCreatorProfileLinkTelemetryPayload({
                actor,
                creator: profileRouteInput,
                href: profileHref,
                routeSource: "admin_roster",
                currentRoute: "/admin/roster",
              }));
            }}
            className="inline-flex min-h-10 items-center rounded-full border border-border bg-background/35 px-4 text-sm font-semibold text-foreground"
          >
            View fan profile
          </Link>
        ) : null}
        {isViewingThisCreator ? (
          <Button variant="ghost"
            type="button"
            onClick={() => void endViewAsCreator("Return from roster")}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background"
          >
            <RotateCcw className="h-4 w-4" />
            Return to admin
          </Button>
        ) : (
          <Button variant="ghost"
            type="button"
            onClick={() => void handleStart()}
            disabled={saving || reason.trim().length < 4}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-foreground disabled:opacity-50"
          >
            <Eye className="h-4 w-4" />
            {saving ? "Starting..." : "View as creator"}
          </Button>
        )}
      </div>
      {!isViewingThisCreator ? (
        <label className="mt-3 block">
          <span className="sr-only">View-as reason</span>
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="QA reason"
            className="w-full rounded-2xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
          />
        </label>
      ) : null}
    </div>
  );
}
