"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "kandydrops:unwrap-counter";
const inMemoryCounts = new Map<string, number>();

type CounterSnapshot = Record<string, number>;

function parseBaseCount(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.floor(numeric));
}

function readStoredSnapshot(): CounterSnapshot {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const normalized: CounterSnapshot = {};
    Object.entries(parsed).forEach(([key, value]) => {
      normalized[key] = parseBaseCount(value);
    });

    return normalized;
  } catch {
    return {};
  }
}

function persistCount(dropId: string, count: number): void {
  inMemoryCounts.set(dropId, count);

  if (typeof window === "undefined") {
    return;
  }

  const snapshot = readStoredSnapshot();
  snapshot[dropId] = count;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function getStartingCount(dropId: string, baseCount: number): number {
  const memoryValue = inMemoryCounts.get(dropId);
  if (Number.isFinite(memoryValue)) {
    return Math.max(baseCount, memoryValue as number);
  }

  const stored = readStoredSnapshot()[dropId];
  if (Number.isFinite(stored)) {
    const normalized = Math.max(baseCount, stored);
    inMemoryCounts.set(dropId, normalized);
    return normalized;
  }

  inMemoryCounts.set(dropId, baseCount);
  return baseCount;
}

function getNextTickDelayMs(createdAt?: number): number {
  if (!Number.isFinite(createdAt)) {
    return (2 + Math.random() * 3) * 60_000;
  }

  const ageMs = Date.now() - Math.floor(createdAt as number);
  const oneDay = 86_400_000;

  if (ageMs <= oneDay) {
    return (2 + Math.random() * 2) * 60_000;
  }

  if (ageMs <= 7 * oneDay) {
    return (3 + Math.random() * 2) * 60_000;
  }

  return (4 + Math.random() * 3) * 60_000;
}

export function useUnwrapCounter(dropId: string | null, baseCount: number, createdAt?: number): number {
  const normalizedBaseCount = useMemo(() => parseBaseCount(baseCount), [baseCount]);
  const [currentCount, setCurrentCount] = useState<number>(normalizedBaseCount);

  useEffect(() => {
    let initialTimeoutId: number | null = null;

    if (!dropId) {
      initialTimeoutId = window.setTimeout(() => {
        setCurrentCount(normalizedBaseCount);
      }, 0);
      return () => {
        if (initialTimeoutId !== null) {
          window.clearTimeout(initialTimeoutId);
        }
      };
    }

    const initialValue = getStartingCount(dropId, normalizedBaseCount);
    initialTimeoutId = window.setTimeout(() => {
      setCurrentCount(initialValue);
    }, 0);

    let timeoutId: number | null = null;
    let cancelled = false;

    const scheduleTick = () => {
      if (cancelled) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        setCurrentCount((previous) => {
          const increment = Math.floor(Math.random() * 3) + 1;
          const next = previous + increment;
          persistCount(dropId, next);
          return next;
        });

        scheduleTick();
      }, getNextTickDelayMs(createdAt));
    };

    scheduleTick();

    return () => {
      cancelled = true;
      if (initialTimeoutId !== null) {
        window.clearTimeout(initialTimeoutId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [dropId, normalizedBaseCount, createdAt]);

  useEffect(() => {
    if (!dropId) {
      return;
    }

    persistCount(dropId, currentCount);
  }, [dropId, currentCount]);

  return currentCount;
}
