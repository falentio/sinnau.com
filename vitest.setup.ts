import { AsyncLocalStorage } from "node:async_hooks";
import { loadEnvFile } from "node:process";

import { configureSync } from "@logtape/logtape";

try {
  loadEnvFile(".env");
} catch (error) {
  console.warn("Failed to load .env file:", error);
}
configureSync({
  contextLocalStorage: new AsyncLocalStorage(),
  loggers: [
    { category: [], lowestLevel: "debug", sinks: ["null"] },
    { category: ["logtape", "meta"], lowestLevel: "warning", sinks: ["null"] },
  ],
  sinks: {
    null: () => {
      /* empty */
    },
  },
});
