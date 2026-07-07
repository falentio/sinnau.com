import { dev } from "$app/environment";
import {
  configure,
  getConsoleSink,
  getJsonLinesFormatter,
} from "@logtape/logtape";
import type { LogRecord, Sink } from "@logtape/logtape";
import { getPrettyFormatter } from "@logtape/pretty";

import { wideEventStorage } from "../als.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractLogContext = (
  data: Record<string, unknown>
): Record<string, unknown> => {
  const ctx: Record<string, unknown> = {};
  if (typeof data.requestId === "string") {
    ctx.requestId = data.requestId;
  }
  const user = data.user;
  if (isRecord(user) && user.id !== undefined) {
    ctx.userId = user.id;
  }
  if (data.route !== undefined) {
    ctx.route = data.route;
  }
  const response = data.response;
  if (isRecord(response) && response.status !== undefined) {
    ctx.responseStatus = response.status;
  }
  if (data.orpc !== undefined) {
    ctx.orpc = data.orpc;
  }
  return ctx;
};

const baseSink = dev
  ? getConsoleSink({
      formatter: getPrettyFormatter({ properties: true }),
      nonBlocking: false,
    })
  : getConsoleSink({
      formatter: getJsonLinesFormatter(),
      nonBlocking: true,
    });

const alsSink: Sink = (record) => {
  const enriched: LogRecord = {
    ...record,
    properties: {
      ...extractLogContext(wideEventStorage.get()),
      ...record.properties,
    },
  };
  baseSink(enriched);
};

// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const disposableBase = baseSink as unknown as {
  [Symbol.dispose]?: () => void;
};
if (typeof disposableBase[Symbol.dispose] === "function") {
  Object.assign(alsSink, {
    [Symbol.dispose]: () => disposableBase[Symbol.dispose]?.(),
  });
}

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
  sinks: { console: alsSink },
});
