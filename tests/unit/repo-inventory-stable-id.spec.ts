import { describe, expect, it } from "vitest";

import { classifyRepoFile, withUniqueStableIds } from "../../scripts/agent/classify-repo-files";

describe("repo inventory stable ids", () => {
  it("adds deterministic suffixes when distinct paths collide after normalization", () => {
    const entries = withUniqueStableIds([
      classifyRepoFile("agent/context/doctrine-cards.jsonl"),
      classifyRepoFile("agent/context/doctrine.cards.jsonl"),
    ]);

    expect(entries[0]?.stable_id).not.toEqual(entries[1]?.stable_id);
    expect(entries[0]?.stable_id).toMatch(/^file__agent__context__doctrine-cards-jsonl__[a-f0-9]{8}$/u);
    expect(entries[1]?.stable_id).toMatch(/^file__agent__context__doctrine-cards-jsonl__[a-f0-9]{8}$/u);
  });
});
