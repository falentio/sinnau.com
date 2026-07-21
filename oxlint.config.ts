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
  jsPlugins: [{ name: "@logtape", specifier: "@logtape/lint/eslint" }],
  overrides: [
    {
      files: ["*.svelte"],
      rules: {
        "prefer-const": "off",
      },
    },
    {
      files: ["*.ts", "*.js"],
      rules: {
        "eslint/require-await": "off",
      },
    },
  ],
  rules: {
    "@logtape/no-message-interpolation": "error",
    "@logtape/no-unawaited-log": "error",
    "@logtape/prefer-lazy-evaluation": "warn",
    "@logtape/require-meta-sink": "warn",
  },
});
