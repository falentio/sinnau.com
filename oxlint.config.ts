import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import svelte from "ultracite/oxlint/svelte";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [core, svelte, vitest],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    ".agents/skills/**",
    "drizzle/*",
    "src/lib/server/infras/db/schema/auth-schema.ts",
  ],
  overrides: [
    {
      files: ["*.svelte"],
      rules: {
        "prefer-const": "off",
      },
    },
  ],
});
