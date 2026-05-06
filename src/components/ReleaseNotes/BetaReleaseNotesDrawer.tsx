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
  return `Updated ${formatUtcTimestamp(note.updatedAtUtc || note.committedAtUtc || note.committedAt || note.generatedAtUtc || note.generatedAt)}`;
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

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] overflow-hidden bg-black/45 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-modal="true"
        aria-labelledby="beta-release-notes-title"
        className="ml-auto flex max-h-[min(34rem,calc(100dvh-7rem))] w-full max-w-md max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#130819]/95 shadow-2xl shadow-black/50"
        data-beta-release-notes-count={visibleNotes.length}
        data-beta-release-notes-freshness={freshness}
        data-beta-changelog-source={source}
        role="dialog"
      >
        <div className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-3 border-b border-white/10 bg-[#130819]/98 px-4 py-4">
          <div className="min-w-0">
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

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-5 text-white/70">
            App-style Beta notes with the latest user-facing fixes and improvements.
          </p>

          {visibleNotes.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/70">
              {isLoading ? "Loading beta updates..." : "No beta updates have been published yet."}
            </div>
          ) : (
            visibleNotes.map((note) => (
              <article key={`${note.version}:${note.commitSha}`} className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-white/55">
                  <span className="font-mono text-white/80">v{note.version}</span>
                  <span>{formatReleaseTimestamp(note)}</span>
                  <span className="rounded-full border border-brand-purple/30 bg-brand-purple/15 px-2 py-0.5 font-bold text-brand-purple">
                    {note.category}
                  </span>
                </div>
                <h3 className="mt-2 truncate text-sm font-bold text-white">{note.title || note.userFacingTitle}</h3>
                <p className="mt-1 text-sm leading-5 text-white/72">{note.summary}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                  Bug fixes and quality-of-life improvements
                </p>
                <ul className="mt-2 space-y-1.5 text-sm leading-5 text-white/68">
                  {note.bullets.slice(0, 5).map((bullet) => (
                    <li key={bullet} className="break-words">- {bullet}</li>
                  ))}
                </ul>
                {note.technicalDetails?.length ? (
                  <details className="mt-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs text-white/58">
                    <summary className="cursor-pointer font-bold text-white/70">Technical details</summary>
                    <ul className="mt-2 space-y-1.5 leading-5">
                      {note.technicalDetails.slice(0, 4).map((detail) => (
                        <li key={detail} className="break-words">- {detail}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </article>
            ))
          )}
        </div>

        <footer className="shrink-0 border-t border-white/10 px-4 py-3 text-xs text-white/45">
          {formatLastUpdated(releaseNotes.generatedAt)}
          {source === "bundled-fallback" ? " [fallback]" : ""}
        </footer>
      </section>
    </div>
  );
}
