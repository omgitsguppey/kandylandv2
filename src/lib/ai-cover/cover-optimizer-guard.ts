import { buildCoverSemanticAllowList, type CoverSemanticBrief } from "./cover-semantic-brief";

export type CoverOptimizerGuardResult = {
  acceptedText: string;
  rejectedText: string[];
  rejectedReasons: string[];
  conflictDetected: boolean;
};

type CoverOptimizerGuardInput = {
  brief: CoverSemanticBrief;
  optimizerPrompt?: string | null;
};

const NEUTRAL_ALLOWED_TOKENS = new Set([
  "square",
  "poster",
  "layout",
  "typography",
  "hierarchy",
  "centered",
  "center",
  "frame",
  "composition",
  "lighting",
  "highlight",
  "contrast",
  "premium",
  "editorial",
  "polish",
  "glow",
  "sparkle",
  "clean",
  "soft",
  "bold",
  "legible",
  "texture",
  "garnish",
  "plating",
  "atmosphere",
  "fresh",
  "bright",
  "warm",
  "cool",
  "glossy",
  "beverage",
  "drink",
  "bakery",
  "candy",
  "dessert",
  "spread",
  "a",
  "an",
  "the",
  "of",
  "to",
  "for",
  "with",
  "while",
  "this",
  "that",
  "from",
  "when",
  "where",
  "into",
  "on",
  "in",
  "by",
  "as",
  "is",
  "are",
  "be",
  "or",
  "not",
  "do",
  "does",
  "did",
  "no",
  "have",
  "has",
  "will",
  "should",
  "can",
  "may",
  "all",
  "one",
  "two",
  "three",
  "four",
  "five",
  "same",
  "new",
  "next",
  "more",
  "less",
  "extra",
  "slightly",
  "very",
  "much",
  "just",
  "like",
  "want",
  "need",
  "always",
  "never",
  "make",
  "add",
  "keep",
  "use",
  "improve",
  "increase",
  "decrease",
  "subject",
  "form",
  "another",
  "style",
  "anchor",
  "supporting",
  "near",
  "duplicate",
  "flavor",
  "food",
  "piece",
  "pieces",
  "arrangement",
  "background",
  "detail",
  "details",
  "their",
  "current",
  "requested",
  "named",
  "same",
  "matches",
  "truncated",
  "prioritize",
  "primary",
  "most",
  "relevant",
  "clear",
  "clarity",
  "separation",
  "color",
  "palette",
  "name",
  "names",
  "converted",
  "well",
  "differentiation",
  "copy",
  "clues",
  "constraints",
  "rules",
  "borrowing",
  "copying",
  "thumbnail",
  "freshness",
  "count",
  "pool",
  "limit",
  "hero",
  "object",
  "objects",
  "prop",
  "props",
  "title",
  "category",
  "interpretation",
  "favor",
  "avoid",
  "reference",
  "reference",
  "safe",
  "only",
  "treat",
  "references",
  "cues",
  "guide",
  "guidance",
  "semantic",
  "semantics",
  "safe-safe",
  "prompt",
  "line",
  "lines",
  "refinement",
  "use",
  "keep",
  "preserve",
  "only",
  "within",
  "unless",
  "explicitly",
  "points",
  "point",
  "otherwise",
  "current",
  "title",
  "brand",
]);

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[’']/g, "'");
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length > 0);
}

function isAllowedToken(token: string, allowedTokens: Set<string>) {
  return allowedTokens.has(token) || NEUTRAL_ALLOWED_TOKENS.has(token);
}

function containsTerm(textTokens: string[], phrase: string) {
  const phraseTokens = tokenize(phrase);
  if (phraseTokens.length === 0) {
    return false;
  }
  if (phraseTokens.length === 1) {
    return textTokens.includes(phraseTokens[0]);
  }

  for (let index = 0; index <= textTokens.length - phraseTokens.length; index += 1) {
    let matched = true;
    for (let offset = 0; offset < phraseTokens.length; offset += 1) {
      if (textTokens[index + offset] !== phraseTokens[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return true;
    }
  }

  return false;
}

export function applyCoverOptimizerGuard(input: CoverOptimizerGuardInput): CoverOptimizerGuardResult {
  const optimizerPrompt = (input.optimizerPrompt || "").trim();
  if (!optimizerPrompt) {
    return {
      acceptedText: "",
      rejectedText: [],
      rejectedReasons: [],
      conflictDetected: false,
    };
  }

  const allowedTokens = new Set(buildCoverSemanticAllowList(input.brief).flatMap((token) => tokenize(token)));
  const rejectedText: string[] = [];
  const rejectedReasons: string[] = [];
  const acceptedLines: string[] = [];

  for (const rawLine of optimizerPrompt.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)) {
    const line = normalizeText(rawLine);
    const lineTokens = tokenize(line);
    const forbiddenPhrase = input.brief.forbiddenTokens.find((token) => containsTerm(lineTokens, token));
    const forbiddenCategory = input.brief.forbiddenCategories.find((token) => containsTerm(lineTokens, token));

    if (forbiddenPhrase || forbiddenCategory) {
      rejectedText.push(rawLine);
      rejectedReasons.push(forbiddenPhrase ? `forbidden token: ${forbiddenPhrase}` : `forbidden category: ${forbiddenCategory}`);
      continue;
    }

    const nonNeutralTokens = lineTokens.filter((token) => !isAllowedToken(token, allowedTokens));
    if (nonNeutralTokens.length > 0) {
      rejectedText.push(rawLine);
      rejectedReasons.push(`object drift: ${nonNeutralTokens.slice(0, 3).join(", ")}`);
      continue;
    }

    if (lineTokens.length > 0) {
      acceptedLines.push(rawLine);
    }
  }

  return {
    acceptedText: acceptedLines.join("\n").trim(),
    rejectedText,
    rejectedReasons,
    conflictDetected: rejectedText.length > 0 && acceptedLines.length === 0,
  };
}
