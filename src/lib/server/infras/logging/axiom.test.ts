import type { LogRecord } from "@logtape/logtape";
import { describe, it, vi } from "vitest";

import { setupAxiom, toAxiomEvent } from "./axiom.ts";

const mockEnv = vi.hoisted<{
  APP_BUILD_DATE: string;
  APP_SHA: string;
  APP_VERSION: string;
  AXIOM_DATASET: string | undefined;
  AXIOM_TOKEN: string | undefined;
  AXIOM_URL: string;
}>(() => ({
  APP_BUILD_DATE: "2026-01-01T00:00:00.000Z",
  APP_SHA: "abc123",
  APP_VERSION: "1.2.3",
  AXIOM_DATASET: "test-dataset",
  AXIOM_TOKEN: "test-token",
  AXIOM_URL: "https://api.axiom.co",
}));

// oxlint-disable-next-line vitest/prefer-import-in-mock
vi.mock("../env.ts", () => ({
  env: {
    get APP_BUILD_DATE() {
      return mockEnv.APP_BUILD_DATE;
    },
    get APP_SHA() {
      return mockEnv.APP_SHA;
    },
    get APP_VERSION() {
      return mockEnv.APP_VERSION;
    },
    get AXIOM_DATASET() {
      return mockEnv.AXIOM_DATASET;
    },
    get AXIOM_TOKEN() {
      return mockEnv.AXIOM_TOKEN;
    },
    get AXIOM_URL() {
      return mockEnv.AXIOM_URL;
    },
  },
}));

const makeRecord = (overrides: Partial<LogRecord> = {}): LogRecord => ({
  category: ["sinnau.com", "auth"],
  level: "info",
  message: ["user ", 42, " logged in"],
  properties: { userId: "u_1" },
  rawMessage: "user {id} logged in",
  timestamp: 1_700_000_000_000,
  ...overrides,
});

describe("toAxiomEvent event mapping", () => {
  it("maps a LogRecord into a full structured Axiom event", ({ expect }) => {
    const event = toAxiomEvent(makeRecord());

    expect(event._time).toBe(new Date(1_700_000_000_000).toISOString());
    expect(event.level).toBe("info");
    expect(event.category).toBe("sinnau.com.auth");
    expect(event.message).toBe("user 42 logged in");
    expect(event.properties).toEqual({ userId: "u_1" });
    expect(event.service).toEqual({
      buildDate: "2026-01-01T00:00:00.000Z",
      name: "sinnau",
      sha: "abc123",
      version: "1.2.3",
    });
  });

  it("joins multi-part messages and keeps raw properties", ({ expect }) => {
    const event = toAxiomEvent(
      makeRecord({
        message: ["failed to ", "connect"],
        properties: { host: "db", retries: 3 },
      })
    );

    expect(event.message).toBe("failed to connect");
    expect(event.properties).toEqual({ host: "db", retries: 3 });
  });
});

describe("setupAxiom sink setup", () => {
  it("returns null and warns when AXIOM_TOKEN is missing", ({ expect }) => {
    mockEnv.AXIOM_TOKEN = undefined;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = setupAxiom();

    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
    mockEnv.AXIOM_TOKEN = "test-token";
  });

  it("returns null when AXIOM_DATASET is missing", ({ expect }) => {
    mockEnv.AXIOM_DATASET = undefined;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = setupAxiom();

    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
    mockEnv.AXIOM_DATASET = "test-dataset";
  });

  it("returns a sink + client when token and dataset are present", ({
    expect,
  }) => {
    const result = setupAxiom();

    expect(result).not.toBeNull();
    expect(result?.client).toBeDefined();
    expect(typeof result?.sink).toBe("function");
  });
});
