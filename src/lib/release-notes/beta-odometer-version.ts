const BETA_PRODUCT_ERA = 1;
const BETA_BLOCK_SIZE = 100;
const BETA_MAX_BLOCK = 99;
const BETA_MAX_RELEASE = 99;
const BETA_MAX_STANDARD_COUNTER = (BETA_MAX_BLOCK * BETA_BLOCK_SIZE) + BETA_MAX_RELEASE;
const BETA_OVERFLOW_NUMERIC_LIMIT = 9999;
const BETA_OVERFLOW_SUFFIXES = "abcdefghijklmnopqrstuvwxyz";

export type BetaOdometerVersionParts = {
  major: 1;
  block: number;
  release: number;
  overflowNumber: number | null;
  overflowSuffix: string | null;
  counter: number;
};

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

export function normalizeBetaReleaseCounter(input: unknown) {
  if (!isFiniteInteger(input) || input < 0) {
    throw new Error(`Beta release counter must be a non-negative integer. Received: ${String(input)}`);
  }

  return input;
}

function formatOverflowVersion(counter: number) {
  const overflowOffset = counter - (BETA_MAX_STANDARD_COUNTER + 1);

  if (overflowOffset < BETA_OVERFLOW_NUMERIC_LIMIT) {
    return `1.99.99.${overflowOffset + 1}`;
  }

  const overflowSuffixOffset = overflowOffset - BETA_OVERFLOW_NUMERIC_LIMIT;
  const suffixIndex = Math.floor(overflowSuffixOffset / BETA_OVERFLOW_NUMERIC_LIMIT);
  if (suffixIndex >= BETA_OVERFLOW_SUFFIXES.length) {
    throw new Error("Beta version overflow exhausted. Manual product-era decision required.");
  }

  const overflowNumber = (overflowSuffixOffset % BETA_OVERFLOW_NUMERIC_LIMIT) + 1;
  const suffix = BETA_OVERFLOW_SUFFIXES[suffixIndex];
  return `1.99.99.${overflowNumber}${suffix}`;
}

export function formatBetaOdometerVersion(input: unknown) {
  const counter = normalizeBetaReleaseCounter(input);

  if (counter <= BETA_MAX_STANDARD_COUNTER) {
    const block = Math.floor(counter / BETA_BLOCK_SIZE);
    const release = counter % BETA_BLOCK_SIZE;
    return `${BETA_PRODUCT_ERA}.${block}.${release}`;
  }

  return formatOverflowVersion(counter);
}

export function parseBetaOdometerVersion(version: string): BetaOdometerVersionParts | null {
  const trimmed = version.trim();
  const normalMatch = /^1\.(\d{1,2})\.(\d{1,2})$/u.exec(trimmed);
  if (normalMatch) {
    const block = Number(normalMatch[1]);
    const release = Number(normalMatch[2]);
    if (block > BETA_MAX_BLOCK || release > BETA_MAX_RELEASE) return null;

    return {
      major: 1,
      block,
      release,
      overflowNumber: null,
      overflowSuffix: null,
      counter: (block * BETA_BLOCK_SIZE) + release,
    };
  }

  const overflowMatch = /^1\.99\.99\.(\d{1,4})([a-z])?$/u.exec(trimmed);
  if (!overflowMatch) return null;

  const overflowNumber = Number(overflowMatch[1]);
  if (overflowNumber < 1 || overflowNumber > BETA_OVERFLOW_NUMERIC_LIMIT) return null;

  const suffix = overflowMatch[2] ?? null;
  const suffixIndex = suffix ? BETA_OVERFLOW_SUFFIXES.indexOf(suffix) : -1;
  if (suffix && suffixIndex === -1) return null;

  const counter = suffix
    ? (BETA_MAX_STANDARD_COUNTER + 1) + BETA_OVERFLOW_NUMERIC_LIMIT + (suffixIndex * BETA_OVERFLOW_NUMERIC_LIMIT) + (overflowNumber - 1)
    : (BETA_MAX_STANDARD_COUNTER + 1) + (overflowNumber - 1);

  return {
    major: 1,
    block: 99,
    release: 99,
    overflowNumber,
    overflowSuffix: suffix,
    counter,
  };
}

export function getNextBetaOdometerVersion(input: unknown) {
  return formatBetaOdometerVersion(normalizeBetaReleaseCounter(input) + 1);
}

export function migrateLegacyVersionToBetaCounter(version: string) {
  const parsed = parseBetaOdometerVersion(version);
  if (parsed) return parsed.counter;

  if (version.trim() === "1.113.4") {
    return 201;
  }

  return null;
}
