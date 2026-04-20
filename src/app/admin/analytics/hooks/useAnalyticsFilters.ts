// @ts-nocheck
import { useState, useCallback } from "react";

export function useAnalyticsFilters() {
  const [activeViewerFilter, setActiveViewerFilter] = useState("all");
  const [viewerUserFilter, setViewerUserFilter] = useState("");
  const [activeSessionFilter, setActiveSessionFilter] = useState("all");
  const [activeDropFilter, setActiveDropFilter] = useState("all");
  const [activeSubFilter, setActiveSubFilter] = useState("all");
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" });
  
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

