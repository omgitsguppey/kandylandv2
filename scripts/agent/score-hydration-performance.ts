import {
    buildHydrationPerformanceReport,
    printHydrationPerformanceSummary,
    writeHydrationPerformanceReport,
} from "../../src/lib/hydration-performance-score";

const report = buildHydrationPerformanceReport();
writeHydrationPerformanceReport(report);
printHydrationPerformanceSummary(report);
