import { AsyncLocalStorage } from "node:async_hooks";

import { configureSync } from "@logtape/logtape";

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
