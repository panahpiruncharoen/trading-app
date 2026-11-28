import { defineConfig } from "vitest/config";

// run with `npm run test:rules`, which starts the firebase emulators these tests talk to
export default defineConfig({
  test: {
    include: ["tests/rules/**/*.test.ts"],
    environment: "node",
    // every test file shares the same emulators, and clears them between tests
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
