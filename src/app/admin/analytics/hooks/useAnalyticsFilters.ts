import { useState, useCallback } from "react";

export function useAnalyticsFilters() {
  
  const clearAllFilters = useCallback(() => {
    setActiveViewerFilter("all");
    setViewerUserFilter("");
    setActiveSessionFilter("all");
    setActiveDropFilter("all");
    setActiveSubFilter("all");
    setCustomDateRange({ start: "", end: "" });
  }, []);

  const clearViewerFilter = useCallback(() => {
    setViewerUserFilter("");
    setActiveViewerFilter("all");
  }, []);

  return {
    activeViewerFilter, setActiveViewerFilter,
    viewerUserFilter, setViewerUserFilter,
    activeSessionFilter, setActiveSessionFilter,
    activeDropFilter, setActiveDropFilter,
    activeSubFilter, setActiveSubFilter,
    customDateRange, setCustomDateRange,
    clearAllFilters, clearViewerFilter,
  };
}
