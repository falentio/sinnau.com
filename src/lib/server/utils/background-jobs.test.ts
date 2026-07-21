import type { LogRecord } from "@logtape/logtape";
import { configureSync, resetSync } from "@logtape/logtape";
import { createLogRecorder } from "@logtape/testing";
import { afterEach, beforeEach, describe, it, vi } from "vitest";

import { waitUntil, waitForAll } from "./background-jobs.ts";

let recorder: ReturnType<typeof createLogRecorder>;

const errorMessage = (props: Record<string, unknown>): string | undefined => {
  const { error } = props;
  return error instanceof Error ? error.message : undefined;
};

const findRecord = (level: LogRecord["level"]): LogRecord | undefined =>
  recorder.records.find(
    (r) =>
      r.level === level && r.category.join(".") === "sinnau.com.background.util"
  );

describe("background-jobs", () => {
  beforeEach(() => {
    resetSync();
    recorder = createLogRecorder();
    configureSync({
      loggers: [
        {
          category: ["logtape", "meta"],
          lowestLevel: "warning",
          sinks: ["meta"],
        },
        {
          category: ["sinnau.com", "background", "util"],
          lowestLevel: "debug",
          sinks: ["recorder"],
        },
      ],
      reset: true,
      sinks: { meta: recorder.sink, recorder: recorder.sink },
    });
  });

  afterEach(() => {
    resetSync();
  });

  describe(waitForAll, () => {
    it("resolves immediately when no jobs were scheduled", async ({
      expect,
    }) => {
      await expect(waitForAll()).resolves.toBeUndefined();
    });

    it("resolves after a single resolved promise", async ({ expect }) => {
      waitUntil(Promise.resolve(42));
      await expect(waitForAll()).resolves.toBeUndefined();
    });

    it("resolves after multiple promises resolve", async ({ expect }) => {
      waitUntil(Promise.resolve(1));
      waitUntil(Promise.resolve(2));
      waitUntil(Promise.resolve(3));
      await expect(waitForAll()).resolves.toBeUndefined();
    });

    it("logs and drains rejected promises without throwing", async ({
      expect,
    }) => {
      waitUntil(Promise.reject(new Error("boom")));
      waitUntil(Promise.resolve("ok"));

      await expect(waitForAll()).resolves.toBeUndefined();
      const record = findRecord("error");
      expect(record).toBeDefined();
      expect(errorMessage(record?.properties ?? {})).toBe("boom");
    });

    it("clears the pending set after drain", async ({ expect }) => {
      waitUntil(Promise.resolve("a"));
      waitUntil(Promise.resolve("b"));
      await waitForAll();
      await expect(waitForAll()).resolves.toBeUndefined();
    });

    it("accumulates jobs added after a drain", async ({ expect }) => {
      await waitForAll();
      waitUntil(Promise.resolve("new"));
      await expect(waitForAll()).resolves.toBeUndefined();
    });

    it("eagerly catches rejection — no unhandled rejection if waitForAll never called", async ({
      expect,
    }) => {
      waitUntil(Promise.reject(new Error("eager")));

      await vi.waitFor(() => {
        const record = findRecord("error");
        expect(record).toBeDefined();
        expect(errorMessage(record?.properties ?? {})).toBe("eager");
      });
    });

    it("removes resolved promise from pending via finally", async ({
      expect,
    }) => {
      waitUntil(Promise.resolve("done"));

      await vi.waitFor(async () => {
        await expect(waitForAll()).resolves.toBeUndefined();
      });
    });

    it("removes rejected promise from pending via finally", async ({
      expect,
    }) => {
      waitUntil(Promise.reject(new Error("gone")));

      await vi.waitFor(() => {
        const record = findRecord("error");
        expect(record).toBeDefined();
        expect(errorMessage(record?.properties ?? {})).toBe("gone");
      });
      await expect(waitForAll()).resolves.toBeUndefined();
    });

    it("warns when pending exceeds threshold, resets flag after drain", async ({
      expect,
    }) => {
      for (let i = 0; i < 1001; i += 1) {
        waitUntil(Promise.resolve(i));
      }

      expect(recorder.records.filter((r) => r.level === "warning").length).toBe(
        1
      );

      await waitForAll();
      expect(recorder.records.filter((r) => r.level === "warning").length).toBe(
        1
      );
    });

    it("does not warn below threshold", async ({ expect }) => {
      for (let i = 0; i < 999; i += 1) {
        waitUntil(Promise.resolve(i));
      }

      expect(recorder.records.filter((r) => r.level === "warning").length).toBe(
        0
      );
      await waitForAll();
    });
  });
});
