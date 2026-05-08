type FourXxDedupeEntry = {
  firstSeenAt: number;
  lastSeenAt: number;
  count: number;
  samplePaths: string[];
};

const FOUR_XX_DEDUPE_MAX_SAMPLES = 5;
const FOUR_XX_DEDUPE_TABLE = new Map<string, FourXxDedupeEntry>();

function buildFingerprint(input: {
  route: string;
  status: number;
  code: string;
  method: string;
  actorClass: string;
  normalizedPattern: string;
}) {
  return [
    input.route,
    input.status,
    input.code,
    input.method.toUpperCase(),
    input.actorClass,
    input.normalizedPattern,
  ].join("|");
}

export function record4xxDedupe(input: {
  route: string;
  status: number;
  code: string;
  method: string;
  actorClass: string;
  normalizedPattern: string;
  samplePath?: string;
}) {
  const fingerprint = buildFingerprint(input);
  const now = Date.now();
  const existing = FOUR_XX_DEDUPE_TABLE.get(fingerprint);
  if (!existing) {
    const samplePaths = input.samplePath ? [input.samplePath] : [];
    const entry: FourXxDedupeEntry = {
      firstSeenAt: now,
      lastSeenAt: now,
      count: 1,
      samplePaths,
    };
    FOUR_XX_DEDUPE_TABLE.set(fingerprint, entry);
    return { fingerprint, entry, isNew: true };
  }

  existing.count += 1;
  existing.lastSeenAt = now;
  if (input.samplePath && !existing.samplePaths.includes(input.samplePath) && existing.samplePaths.length < FOUR_XX_DEDUPE_MAX_SAMPLES) {
    existing.samplePaths.push(input.samplePath);
  }
  FOUR_XX_DEDUPE_TABLE.set(fingerprint, existing);
  return { fingerprint, entry: existing, isNew: false };
}

export function read4xxDedupeTable() {
  return new Map(FOUR_XX_DEDUPE_TABLE);
}
