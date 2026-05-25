import type { RollingWindow } from "@/lib/admin-overview";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type PlatformPulseTrend = "up" | "down" | "flat" | "new";

export type PlatformPulseDelta = {
  current: number;
  prior: number;
  percentChange: number | null;
  direction: "up" | "down" | "flat";
  noPriorBaseline: boolean;
};

export type FormattedPlatformPulseDelta = {
  text: string;
  title: string;
  ariaLabel: string;
};

function normalizeMetricValue(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function formatPercent(value: number) {
  const absoluteValue = Math.abs(value);
  const precision = absoluteValue >= 10 || Number.isInteger(absoluteValue) ? 0 : 1;
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${absoluteValue.toFixed(precision)}%`;
}

export function buildPlatformPulseWindow(nowMs = Date.now()): RollingWindow {
  const currentEndMs = nowMs;
  const currentStartMs = currentEndMs - THIRTY_DAYS_MS;
  const priorEndMs = currentStartMs;
  const priorStartMs = priorEndMs - THIRTY_DAYS_MS;

  return {
    nowUtc: new Date(currentEndMs).toISOString(),
    currentStartUtc: new Date(currentStartMs).toISOString(),
    currentEndUtc: new Date(currentEndMs).toISOString(),
    priorStartUtc: new Date(priorStartMs).toISOString(),
    priorEndUtc: new Date(priorEndMs).toISOString(),
    label: "rolling_30d",
  };
}

export function calculatePlatformPulseDelta(current: number, prior: number): PlatformPulseDelta {
  const safeCurrent = normalizeMetricValue(current);
  const safePrior = normalizeMetricValue(prior);

  if (safePrior === 0) {
    return {
      current: safeCurrent,
      prior: safePrior,
      percentChange: safeCurrent > 0 ? null : 0,
      direction: safeCurrent > 0 ? "up" : "flat",
      noPriorBaseline: safeCurrent > 0,
    };
  }

  const percentChange = Number((((safeCurrent - safePrior) / safePrior) * 100).toFixed(1));

  return {
    current: safeCurrent,
    prior: safePrior,
    percentChange,
    direction: percentChange > 0 ? "up" : percentChange < 0 ? "down" : "flat",
    noPriorBaseline: false,
  };
}

export function classifyPlatformPulseTrend(delta: PlatformPulseDelta): PlatformPulseTrend {
  if (delta.noPriorBaseline) return "new";
  if (delta.direction === "up") return "up";
  if (delta.direction === "down") return "down";
  return "flat";
}

export function formatPlatformPulseDelta(delta: PlatformPulseDelta): FormattedPlatformPulseDelta {
  if (delta.noPriorBaseline) {
    return {
      text: "New",
      title: "New: current 30d has activity with no prior 30d baseline.",
      ariaLabel: "New: prior 30d was 0",
    };
  }

  const text = formatPercent(delta.percentChange ?? 0);

  return {
    text,
    title: `Current 30d vs previous 30d: ${text}`,
    ariaLabel: `Current 30d vs previous 30d: ${text}`,
  };
}
