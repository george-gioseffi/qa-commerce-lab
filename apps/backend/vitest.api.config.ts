import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["src/test/api-safety.ts"],
    include: ["src/test/api.spec.ts"],
    testTimeout: 30000,
  },
});
