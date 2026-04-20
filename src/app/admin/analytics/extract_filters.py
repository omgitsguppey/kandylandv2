import re

page_path = r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\page.tsx"
with open(page_path, 'r', encoding='utf-8') as f:
    page_content = f.read()

# EXTRACT FILTERS
start_filters = page_content.find('const [activeViewerFilter')
end_filters = page_content.find('const {', start_filters)

# EXTRACT DATA
start_data = page_content.find('const {', start_filters) # after filters
end_data = page_content.find('const analyticsSectionHealth = [')
end_health = page_content.find('];\n', end_data) + 3

filters_code = page_content[start_filters:end_filters]
data_code = page_content[start_data:end_health]

print("Filters len:", len(filters_code))
print("Data len:", len(data_code))

# Create useAnalyticsFilters.ts
filters_file = """import { useState, useCallback } from "react";

export function useAnalyticsFilters() {
  """ + filters_code + """
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
"""

with open(r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\hooks\useAnalyticsFilters.ts", 'w', encoding='utf-8') as f:
    f.write(filters_file)

# For Data, we can just dump all the variables and return them
data_return_obj = "return { analyticsSectionHealth, " + ", ".join([
    # We will just write a regex to find all const variable names declared at root level of data_code
]) + " };"
