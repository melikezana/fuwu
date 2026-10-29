import { defineConfig } from "vitest/config";
import unit from "./vitest.unit.config";
export default defineConfig({ ...unit, test: { ...unit.test,
  name: "security", include: ["tests/security/**/*.test.ts"],
  outputFile: "artifacts/security-testing/security.json",
} });
