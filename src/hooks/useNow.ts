"use client";

import { useSyncExternalStore } from "react";

type NowListener = () => void;

interface NowStore {
  intervalMs: number;
  intervalId: number | null;
  syncId: number | null;
  listeners: Set<NowListener>;
  nowMs: number;
}

interface UseNowOptions {
  intervalMs?: number;
  initialNowMs?: number;
  enabled?: boolean;
}

const nowStores = new Map<number, NowStore>();

function getNowStore(intervalMs: number): NowStore {
  let store = nowStores.get(intervalMs);
  if (store) {
    return store;
  }

  store = {
    intervalMs,
    intervalId: null,
    syncId: null,
    listeners: new Set(),
    nowMs: typeof window === "undefined" ? 0 : Date.now(),
  };
  nowStores.set(intervalMs, store);
  return store;
}

function notifyNowStore(store: NowStore) {
  for (const listener of store.listeners) {
    listener();
  }
}

function tickNowStore(store: NowStore) {
  store.nowMs = Date.now();
  notifyNowStore(store);
}

function startNowStore(store: NowStore) {
  if (typeof window === "undefined" || store.intervalId !== null) {
    return;
  }

  store.syncId = window.setTimeout(() => {
    store.syncId = null;
    if (store.listeners.size === 0) {
      return;
    }

    tickNowStore(store);
  }, 0);

  store.intervalId = window.setInterval(() => {
    tickNowStore(store);
  }, store.intervalMs);
}

function stopNowStore(store: NowStore) {
  if (typeof window === "undefined") {
    return;
  }

  if (store.syncId !== null) {
    window.clearTimeout(store.syncId);
    store.syncId = null;
  }

  if (store.intervalId !== null) {
    window.clearInterval(store.intervalId);
    store.intervalId = null;
  }
}

function subscribeToNowStore(store: NowStore, listener: NowListener) {
  store.listeners.add(listener);
  startNowStore(store);

  return () => {
    store.listeners.delete(listener);
    if (store.listeners.size === 0) {
      stopNowStore(store);
    }
  };
}

export function useNow({
  intervalMs = 1_000,
  initialNowMs = 0,
  enabled = true,
}: UseNowOptions = {}) {
  const store = getNowStore(intervalMs);

  return useSyncExternalStore(
    enabled
      ? (listener) => subscribeToNowStore(store, listener)
      : () => () => {},
    () => (enabled && store.nowMs > 0 ? store.nowMs : initialNowMs),
    () => initialNowMs,
  );
}
