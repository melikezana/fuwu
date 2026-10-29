import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve("src") } },
  test: {
    name: "backend-unit", environment: "node", include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"], clearMocks: true, restoreMocks: true,
    reporters: ["default", "json"], outputFile: "artifacts/security-testing/unit.json",
    coverage: {
      provider: "v8", reporter: ["text", "json-summary", "html"],
      reportsDirectory: "artifacts/security-testing/coverage",
      include: ["src/lib/commerce/pricing.ts", "src/lib/commerce/payment.ts", "src/lib/commerce/order-state.ts", "src/lib/security/safeRedirect.ts", "src/lib/security/requestBoundary.ts", "src/lib/validations/imageMagicBytes.ts"],
      thresholds: { perFile: true, lines: 90, functions: 90, statements: 90, branches: 85 },
    },
  },
});
