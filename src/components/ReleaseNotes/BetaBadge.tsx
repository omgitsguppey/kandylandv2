"use client";

import { startTransition, useState } from "react";
import { Button } from "@/components/ui/Button";

import { BetaReleaseNotesDrawer } from "@/components/ReleaseNotes/BetaReleaseNotesDrawer";
import { PUBLIC_RELEASE_NOTES_VERSION_CONTEXT } from "@/lib/release-notes/public-release-notes";
import { trackEvent } from "@/lib/telemetry";

export function BetaBadge() {
  const [isOpen, setIsOpen] = useState(false);

  const openReleaseNotes = () => {
    trackEvent("beta_badge_clicked", {
      source_component: "navbar_beta_badge",
      release_channel: PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.releaseChannel,
      app_version: PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion,
    });
    startTransition(() => setIsOpen(true));
  };

  const closeReleaseNotes = () => {
    trackEvent("beta_changelog_closed", {
      source_component: "navbar_beta_badge",
      release_channel: PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.releaseChannel,
      app_version: PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion,
    });
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={openReleaseNotes}
        className="min-w-11 shrink-0 text-xs"
        aria-label="Open KandyDrops beta release notes"
        data-beta-badge="public-release-notes"
        data-beta-version={PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion}
      >
        <span className="font-medium">
          Beta
        </span>
      </Button>

      {isOpen ? (
        <BetaReleaseNotesDrawer isOpen={isOpen} onClose={closeReleaseNotes} />
      ) : null}
    </>
  );
}
