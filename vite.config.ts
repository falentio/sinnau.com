import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: {
    coverage: {
      enabled: false,
      exclude: [
        "src/**/*.{test,spec}.{js,ts}",
        "src/**/*.svelte.{test,spec}.{js,ts}",
        "src/**/*.d.ts",
        "src/app.html",
        "src/hooks.*",
        "src/lib/vitest-examples/**",
        "src/lib/server/infras/db/schema/**",
        "src/lib/server/infras/db/testing.ts",
        "src/lib/server/services/study-set/study-set.testing.ts",
        "src/lib/components/ui/**",
      ],
      include: ["src/**/*.{js,ts,svelte}"],
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
    },
    expect: {
      requireAssertions: true,
    },
    maxConcurrency: 20,
    projects: [
      {
        extends: "./vite.config.ts",
        test: {
          environment: "node",
          exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
          include: ["src/**/*.{test,spec}.{js,ts}"],
          name: "server",
        },
      },
    ],
    reporters:
      process.env.GITHUB_ACTIONS === "true"
        ? ["dot", "github-actions"]
        : ["dot"],
  },
});
