"use client";

import { useEffect, useState } from "react";

import {
  PUBLIC_RELEASE_NOTES_FALLBACK,
  PUBLIC_RELEASE_NOTES_VERSION_CONTEXT,
} from "@/lib/release-notes/public-release-notes";
import {
  PUBLIC_RELEASE_CHANNEL,
  type PublicReleaseNote,
  type PublicReleaseNotesDocument,
  isValidPublicVersion,
} from "@/lib/release-notes/release-version-contract";

export type PublicReleaseNotesSource = "public-json" | "bundled-fallback";
export type PublicReleaseNotesFreshness = "fresh" | "stale" | "fallback" | "failed";

type PublicReleaseNotesState = {
  releaseNotes: PublicReleaseNotesDocument;
  source: PublicReleaseNotesSource;
  freshness: PublicReleaseNotesFreshness;
  isLoading: boolean;
};

function isPublicReleaseNote(value: unknown): value is PublicReleaseNote {
  if (!value || typeof value !== "object") return false;
  const note = value as PublicReleaseNote;

  return typeof note.version === "string"
    && typeof note.previousVersion === "string"
    && typeof note.betaReleaseCounter === "number"
    && typeof note.commitSha === "string"
    && typeof note.commitTitle === "string"
    && typeof note.commitCount === "number"
    && Array.isArray(note.commitShas)
    && typeof note.committedAt === "string"
    && typeof note.generatedAt === "string"
    && typeof note.committedAtUtc === "string"
    && typeof note.generatedAtUtc === "string"
    && typeof note.title === "string"
    && typeof note.updatedAtUtc === "string"
    && typeof note.summary === "string"
    && typeof note.userFacingTitle === "string"
    && typeof note.audience === "string"
    && Array.isArray(note.bullets)
    && Array.isArray(note.affectedSurfaces);
}

function isPublicReleaseNotesDocument(value: unknown): value is PublicReleaseNotesDocument {
  if (!value || typeof value !== "object") return false;
  const document = value as PublicReleaseNotesDocument;

  return isValidPublicVersion(document.currentVersion)
    && typeof document.betaReleaseCounter === "number"
    && document.channel === PUBLIC_RELEASE_CHANNEL
    && typeof document.generatedAt === "string"
    && typeof document.generatedAtUtc === "string"
    && typeof document.lastCommitSha === "string"
    && Array.isArray(document.notes)
    && document.notes.every(isPublicReleaseNote);
}

function getFreshness(generatedAt: string): PublicReleaseNotesFreshness {
  const timestamp = Date.parse(generatedAt);
  if (!Number.isFinite(timestamp)) return "stale";

  const ageMs = Date.now() - timestamp;
  return ageMs > 1000 * 60 * 60 * 24 * 14 ? "stale" : "fresh";
}

export function usePublicReleaseNotes(enabled: boolean) {
  const [state, setState] = useState<PublicReleaseNotesState>(() => ({
    releaseNotes: PUBLIC_RELEASE_NOTES_FALLBACK,
    source: "bundled-fallback",
    freshness: "fallback",
    isLoading: enabled,
  }));

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    setState((current) => ({ ...current, isLoading: true }));

    const releaseNotesUrl = `/kandydrops-release-notes.json?v=${encodeURIComponent(PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion)}`;

    fetch(releaseNotesUrl, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`release notes fetch failed: ${response.status}`);
        const json: unknown = await response.json();
        if (!isPublicReleaseNotesDocument(json)) throw new Error("release notes payload failed validation");

        setState({
          releaseNotes: json,
          source: "public-json",
          freshness: getFreshness(json.generatedAt),
          isLoading: false,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.warn("[ReleaseNotes] Using bundled fallback release notes.", error);
        setState({
          releaseNotes: PUBLIC_RELEASE_NOTES_FALLBACK,
          source: "bundled-fallback",
          freshness: "failed",
          isLoading: false,
        });
      });

    return () => controller.abort();
  }, [enabled]);

  return {
    ...state,
    versionContext: PUBLIC_RELEASE_NOTES_VERSION_CONTEXT,
  };
}
