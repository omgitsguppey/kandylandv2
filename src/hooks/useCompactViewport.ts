"use client";

import { useEffect, useState } from "react";

const COMPACT_VIEWPORT_QUERY = "(max-width: 767px)";

export function useCompactViewport() {
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(COMPACT_VIEWPORT_QUERY);
    const syncViewport = () => setIsCompactViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  return isCompactViewport;
}
