"use client";

import { useEffect, useState } from "react";

import { DEVICE_VIEWPORT_QUERIES } from "@/lib/device-layout-contract";

export function useCompactViewport() {
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(DEVICE_VIEWPORT_QUERIES.compact);
    const syncViewport = () => setIsCompactViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  return isCompactViewport;
}
