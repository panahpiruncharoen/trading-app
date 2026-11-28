import { defineConfig } from "vitest/config";

// kept apart from vite.config.ts, as the react-router plugin expects a full app build
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["app/**/*.test.ts"],
    environment: "node",
  },
});
