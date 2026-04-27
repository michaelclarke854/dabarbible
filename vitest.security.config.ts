/**
 * Dedicated Vitest project for the live-database security regression
 * suite. Kept separate from the unit-test config so:
 *   - it runs in a Node environment (no jsdom needed),
 *   - it does not load the React testing-library setup file,
 *   - CI can run unit + security + visual suites independently.
 */
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/security/**/*.test.ts"],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    // No setupFiles — anon client is created per-import.
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});