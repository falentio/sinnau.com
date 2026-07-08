import { Axiom } from "@axiomhq/js";
import type { Axiom as AxiomClient } from "@axiomhq/js";
import type { LogRecord, Sink } from "@logtape/logtape";

import { env } from "../env.ts";

const FLUSH_INTERVAL_MS = 10_000;

export interface AxiomEvent {
  _time: string;
  category: string;
  level: string;
  message: string;
  properties: Record<string, unknown>;
  service: {
    buildDate: string;
    name: string;
    sha: string;
    version: string;
  };
}

export const toAxiomEvent = (record: LogRecord): AxiomEvent => ({
  _time: new Date(record.timestamp).toISOString(),
  category: record.category.join("."),
  level: record.level,
  message: record.message.join(""),
  properties: record.properties,
  service: {
    buildDate: env.APP_BUILD_DATE,
    name: "sinnau",
    sha: env.APP_SHA,
    version: env.APP_VERSION,
  },
});

export interface AxiomSetup {
  client: AxiomClient;
  sink: Sink;
}

export const setupAxiom = (): AxiomSetup | null => {
  const token = env.AXIOM_TOKEN;
  const dataset = env.AXIOM_DATASET;
  if (token === undefined || dataset === undefined) {
    console.warn(
      "[axiom] AXIOM_TOKEN or AXIOM_DATASET missing — Axiom sink disabled."
    );
    return null;
  }

  const client = new Axiom({
    axiomClient: `sinnau/${env.APP_VERSION}`,
    edgeUrl: env.AXIOM_URL,
    onError: (error) => {
      console.error("[axiom] ingest error:", error);
    },
    token,
  });

  const sink = (record: LogRecord) => {
    client.ingest(dataset, [toAxiomEvent(record)]);
  };

  return { client, sink };
};

export const startAxiomFlush = (client: AxiomClient): void => {
  const flush = async (): Promise<void> => {
    try {
      await client.flush();
    } catch (error) {
      console.error("[axiom] flush error:", error);
    }
  };

  const timer = setInterval(() => {
    void flush();
  }, FLUSH_INTERVAL_MS);
  if (typeof timer.unref === "function") {
    timer.unref();
  }

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      void flush();
    });
  }
  process.on("beforeExit", () => {
    void flush();
  });
};
