"use client";

import { useCallback, useEffect, useRef } from "react";

import { trackEvent } from "@/lib/telemetry";
import { DROPS_MOBILE_UI_DENSITY } from "@/hooks/useDropCardImpression";
import { resolveDropsDiscoverySort, sanitizeDiscoveryQuery } from "@/lib/discovery-telemetry";
import { SEARCH_COST_POLICY } from "@/lib/discovery/search-cost-contract";
import { buildSearchTelemetryPayload } from "@/lib/discovery/search-telemetry-contract";

type DropsSearchTelemetryDrop = {
  id: string;
};

export function useDropsSearchTelemetry(input: {
  deferredSearchQuery: string;
  filteredDrops: DropsSearchTelemetryDrop[];
  selectedCategory: string;
}) {
  const { deferredSearchQuery, filteredDrops, selectedCategory } = input;
  const lastTrackedSearchRef = useRef("");
  const lastTrackedSearchChangeRef = useRef("");
  const searchFocusedTrackedRef = useRef(false);

  useEffect(() => {
    const normalizedQuery = deferredSearchQuery.trim();
    const sanitizedQuery = sanitizeDiscoveryQuery(normalizedQuery);
    const discoverySort = resolveDropsDiscoverySort(selectedCategory);
    const searchKey = `${sanitizedQuery}:${selectedCategory}:${discoverySort}:${filteredDrops.length}`;
    const changeKey = `${sanitizedQuery}:${selectedCategory}`;

    if (!sanitizedQuery) {
      if (lastTrackedSearchRef.current || lastTrackedSearchChangeRef.current) {
        trackEvent("search_cleared", buildSearchTelemetryPayload({
          eventName: "search_cleared",
          surface: "drops",
          sourceComponent: "compact_drops_filter_bar",
          queryText: "",
          resultCount: filteredDrops.length,
          resultType: "drop",
          executionMode: "local_filter",
          debounced: true,
          minQueryLength: SEARCH_COST_POLICY.backendMinQueryLength,
          pageSize: SEARCH_COST_POLICY.pageSizeMax,
        }));
        lastTrackedSearchRef.current = "";
        lastTrackedSearchChangeRef.current = "";
      }
      return;
    }

    if (changeKey !== lastTrackedSearchChangeRef.current) {
      lastTrackedSearchChangeRef.current = changeKey;
      trackEvent("search_query_changed", buildSearchTelemetryPayload({
        eventName: "search_query_changed",
        surface: "drops",
        sourceComponent: "compact_drops_filter_bar",
        queryText: sanitizedQuery,
        resultCount: filteredDrops.length,
        resultType: "drop",
        executionMode: "local_filter",
        debounced: true,
        minQueryLength: SEARCH_COST_POLICY.backendMinQueryLength,
        pageSize: SEARCH_COST_POLICY.pageSizeMax,
      }));
    }

    if (sanitizedQuery.length < SEARCH_COST_POLICY.backendMinQueryLength || searchKey === lastTrackedSearchRef.current) {
      return;
    }

    lastTrackedSearchRef.current = searchKey;
    const commonSearchPayload = {
      surface: "drops",
      sourceComponent: "compact_drops_filter_bar",
      queryText: sanitizedQuery,
      queryLength: normalizedQuery.length,
      resultCount: filteredDrops.length,
      resultType: "drop" as const,
      executionMode: "local_filter" as const,
      debounced: true,
      minQueryLength: SEARCH_COST_POLICY.backendMinQueryLength,
      pageSize: SEARCH_COST_POLICY.pageSizeMax,
    };

    trackEvent("search_submitted", buildSearchTelemetryPayload({
      eventName: "search_submitted",
      ...commonSearchPayload,
      queryCategory: discoverySort,
    }));
    trackEvent(filteredDrops.length === 0 ? "search_zero_results" : "search_results_loaded", buildSearchTelemetryPayload({
      eventName: filteredDrops.length === 0 ? "search_zero_results" : "search_results_loaded",
      ...commonSearchPayload,
      queryCategory: selectedCategory === "All" ? discoverySort : selectedCategory,
    }));
  }, [deferredSearchQuery, filteredDrops.length, selectedCategory]);

  const trackSearchResultClicked = useCallback((dropId: string, sourceComponent = "drops_page") => {
    const normalizedQuery = deferredSearchQuery.trim();
    const sanitizedQuery = sanitizeDiscoveryQuery(normalizedQuery);
    if (sanitizedQuery.length < SEARCH_COST_POLICY.backendMinQueryLength) {
      return;
    }

    const resultPosition = filteredDrops.findIndex((entry) => entry.id === dropId) + 1;
    trackEvent("search_result_clicked", buildSearchTelemetryPayload({
      eventName: "search_result_clicked",
      surface: "drops",
      sourceComponent,
      queryText: sanitizedQuery,
      queryLength: normalizedQuery.length,
      queryCategory: selectedCategory === "All" ? resolveDropsDiscoverySort(selectedCategory) : selectedCategory,
      resultCount: filteredDrops.length,
      resultType: "drop",
      resultId: dropId,
      resultPosition: resultPosition > 0 ? resultPosition : undefined,
      executionMode: "local_filter",
      debounced: true,
      minQueryLength: SEARCH_COST_POLICY.backendMinQueryLength,
      pageSize: SEARCH_COST_POLICY.pageSizeMax,
    }));
  }, [deferredSearchQuery, filteredDrops, selectedCategory]);

  const trackSearchFocus = useCallback(() => {
    if (searchFocusedTrackedRef.current) {
      return;
    }
    searchFocusedTrackedRef.current = true;
    trackEvent("search_focused", buildSearchTelemetryPayload({
      eventName: "search_focused",
      surface: "drops",
      sourceComponent: "compact_drops_filter_bar",
      queryText: "",
      resultCount: filteredDrops.length,
      resultType: "drop",
      executionMode: "local_filter",
      debounced: true,
      minQueryLength: SEARCH_COST_POLICY.backendMinQueryLength,
      pageSize: SEARCH_COST_POLICY.pageSizeMax,
    }));
  }, [filteredDrops.length]);

  const trackCategorySelected = useCallback((category: string) => {
    const { event_name: _eventName, ...safeSearchFields } = buildSearchTelemetryPayload({
      eventName: "search_query_changed",
      surface: "drops",
      sourceComponent: "compact_drops_filter_bar",
      queryText: sanitizeDiscoveryQuery(deferredSearchQuery),
      queryLength: deferredSearchQuery.trim().length,
      resultCount: filteredDrops.length,
      resultType: "drop",
      executionMode: "local_filter",
      debounced: true,
      minQueryLength: SEARCH_COST_POLICY.backendMinQueryLength,
      pageSize: SEARCH_COST_POLICY.pageSizeMax,
    });

    trackEvent("drops_category_selected", {
      category,
      sort: resolveDropsDiscoverySort(category),
      ...safeSearchFields,
      source_component: "compact_drops_filter_bar",
      ui_density: DROPS_MOBILE_UI_DENSITY,
      visible_drop_count: filteredDrops.length,
    });
  }, [deferredSearchQuery, filteredDrops.length]);

  return {
    trackCategorySelected,
    trackSearchFocus,
    trackSearchResultClicked,
  };
}
