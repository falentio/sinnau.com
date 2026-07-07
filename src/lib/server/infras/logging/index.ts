import { dev } from "$app/environment";
import {
  configure,
  getConsoleSink,
  getJsonLinesFormatter,
} from "@logtape/logtape";
import { getPrettyFormatter } from "@logtape/pretty";

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

await configure({
  loggers: [
    {
      category: ["sinnau.com"],
      lowestLevel: dev ? "debug" : "info",
      sinks: ["console"],
    },
    {
      category: ["logtape", "meta"],
      lowestLevel: "warning",
      sinks: ["console"],
    },
  ],
  reset: true,
  sinks: { console: getSink() },
});
