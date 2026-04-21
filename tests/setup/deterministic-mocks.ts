import { vi, afterAll } from "vitest";

// Mock Math.random to always return 0.5
const originalRandom = Math.random;
Math.random = () => 0.5;

// Mock crypto.randomUUID if it exists in the environment
if (typeof crypto !== "undefined" && crypto.randomUUID) {
    const originalRandomUUID = crypto.randomUUID;
    crypto.randomUUID = () => "00000000-0000-4000-8000-000000000000" as `${string}-${string}-${string}-${string}-${string}`;
}

// Note: Date is typically not fully mocked by default unless explicitly needed because 
// React, React DOM, and other libraries heavily depend on it internally.
// We expose a utility to mock Date manually in tests if they need strict time tracking.
// If an agent needs strict time, use: vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

// Clean up function to run after all tests
afterAll(() => {
    Math.random = originalRandom;
    vi.useRealTimers();
});
