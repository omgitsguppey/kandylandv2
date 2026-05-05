"use client";

import { Suspense, lazy, startTransition, useState } from "react";

import { PUBLIC_RELEASE_NOTES_VERSION_CONTEXT } from "@/lib/release-notes/public-release-notes";
import { trackEvent } from "@/lib/telemetry";

const BetaReleaseNotesDrawer = lazy(() =>
  import("@/components/ReleaseNotes/BetaReleaseNotesDrawer").then((module) => ({
    default: module.BetaReleaseNotesDrawer,
  })),
);

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
      <button
        type="button"
        onClick={openReleaseNotes}
        className="group inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-1 focus:outline-none focus:ring-2 focus:ring-brand-purple/60"
        aria-label="Open KandyDrops beta release notes"
        data-beta-badge="public-release-notes"
        data-beta-version={PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion}
      >
        <span className="rounded-full border border-brand-purple/35 bg-white/[0.08] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/80 shadow-[0_0_18px_rgba(178,140,255,0.22)] transition group-hover:border-brand-purple/55 group-hover:bg-brand-purple/[0.18] group-hover:text-white">
          Beta
        </span>
      </button>

      {isOpen ? (
        <Suspense fallback={null}>
          <BetaReleaseNotesDrawer isOpen={isOpen} onClose={closeReleaseNotes} />
        </Suspense>
      ) : null}
    </>
  );
}
