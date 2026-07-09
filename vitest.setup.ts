import { configureSync } from "@logtape/logtape";

configureSync({
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
