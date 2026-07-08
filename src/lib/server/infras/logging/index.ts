import { dev } from "$app/environment";
import {
  configure,
  getConsoleSink,
  getJsonLinesFormatter,
} from "@logtape/logtape";
import { getPrettyFormatter } from "@logtape/pretty";

import { setupAxiom, startAxiomFlush } from "./axiom.ts";

const getSink = () => {
  if (dev) {
    return getConsoleSink({
      formatter: getPrettyFormatter({ properties: true }),
      nonBlocking: false,
    });
  }
  return getConsoleSink({
    formatter: getJsonLinesFormatter(),
    nonBlocking: true,
  });
};

const axiom = setupAxiom();
if (axiom) {
  startAxiomFlush(axiom.client);
}

const sinks = {
  console: getSink(),
  ...(axiom ? { axiom: axiom.sink } : {}),
};

const loggerSinks = axiom ? ["console", "axiom"] : ["console"];

await configure({
  loggers: [
    {
      category: ["sinnau.com"],
      lowestLevel: dev ? "debug" : "info",
      sinks: loggerSinks,
    },
    {
      category: ["logtape", "meta"],
      lowestLevel: "warning",
      sinks: loggerSinks,
    },
  ],
  reset: true,
  sinks,
});
