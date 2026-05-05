"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { usePublicReleaseNotes } from "@/hooks/usePublicReleaseNotes";
import {
  getPublicReleaseNotesVisibleNotes,
  type PublicReleaseNote,
} from "@/lib/release-notes/release-version-contract";
import { trackEvent } from "@/lib/telemetry";

type BetaReleaseNotesDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

function formatUtcTimestamp(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "UTC timestamp unavailable";

  const date = new Date(timestamp);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

function formatReleaseTimestamp(note: PublicReleaseNote) {
  return `Updated ${formatUtcTimestamp(note.committedAtUtc || note.committedAt || note.generatedAtUtc || note.generatedAt)}`;
}

function formatLastUpdated(generatedAt: string) {
  return `Last updated ${formatUtcTimestamp(generatedAt)}`;
}

export function BetaReleaseNotesDrawer({ isOpen, onClose }: BetaReleaseNotesDrawerProps) {
  const { releaseNotes, source, freshness, isLoading } = usePublicReleaseNotes(isOpen);
  const visibleNotes = getPublicReleaseNotesVisibleNotes(releaseNotes.notes);
  const openedTrackedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || isLoading || openedTrackedRef.current) return;

    const latestNote = getPublicReleaseNotesVisibleNotes(releaseNotes.notes)[0] ?? releaseNotes.notes[0];
    trackEvent("beta_changelog_opened", {
      source_component: "navbar_beta_badge",
      release_channel: releaseNotes.channel,
      app_version: releaseNotes.currentVersion,
      currentVersion: releaseNotes.currentVersion,
      latestNoteCommittedAtUtc: latestNote?.committedAtUtc ?? "none",
      latestNoteCommitSha: latestNote?.commitSha ?? "none",
      releaseNotesFreshnessState: freshness,
      releaseNotesSource: source,
    });
    openedTrackedRef.current = true;
  }, [freshness, isLoading, isOpen, releaseNotes, source]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/45 px-3 pt-[calc(4.5rem+env(safe-area-inset-top))] backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-modal="true"
        aria-labelledby="beta-release-notes-title"
        className="ml-auto max-h-[min(34rem,calc(100dvh-6rem))] w-full max-w-md overflow-hidden rounded-[2rem] border border-white/12 bg-[#130819]/95 shadow-2xl shadow-black/50"
        data-beta-release-notes-count={visibleNotes.length}
        data-beta-release-notes-freshness={freshness}
        data-beta-changelog-source={source}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-purple">Beta notes</p>
            <h2 id="beta-release-notes-title" className="mt-1 text-xl font-black text-white">
              What&apos;s new in Beta
            </h2>
            <p className="mt-1 text-sm text-white/65">Current version: v{releaseNotes.currentVersion}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-purple/60"
            aria-label="Close beta release notes"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[24rem] space-y-3 overflow-y-auto px-5 py-4">
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            Updated continuously as KandyDrops improves.
          </p>

          {visibleNotes.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/70">
              {isLoading ? "Loading beta updates..." : "No beta updates have been published yet."}
            </div>
          ) : (
            visibleNotes.map((note) => (
              <article key={`${note.version}:${note.commitSha}`} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
                  <span className="font-mono text-white/80">v{note.version}</span>
                  <span>{formatReleaseTimestamp(note)}</span>
                  <span className="rounded-full border border-brand-purple/30 bg-brand-purple/15 px-2 py-0.5 font-bold text-brand-purple">
                    {note.category}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-bold text-white">{note.userFacingTitle}</h3>
                <ul className="mt-2 space-y-1.5 text-sm leading-5 text-white/68">
                  {note.bullets.slice(0, 3).map((bullet) => (
                    <li key={bullet}>- {bullet}</li>
                  ))}
                </ul>
              </article>
            ))
          )}
        </div>

        <footer className="border-t border-white/10 px-5 py-3 text-xs text-white/45">
          {formatLastUpdated(releaseNotes.generatedAt)}
          {source === "bundled-fallback" ? " [fallback]" : ""}
        </footer>
      </section>
    </div>
  );
}
