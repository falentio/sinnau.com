import { beforeEach, describe, it, vi } from "vitest";

import { waitUntil, waitForAll } from "./background-jobs.ts";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe(waitForAll, () => {
  it("resolves immediately when no jobs were scheduled", async ({ expect }) => {
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
    vi.spyOn(console, "error").mockImplementation(() => {});

    waitUntil(Promise.reject(new Error("boom")));
    waitUntil(Promise.resolve("ok"));

    await expect(waitForAll()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      "Background job failed:",
      expect.objectContaining({ message: "boom" })
    );
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
    vi.spyOn(console, "error").mockImplementation(() => {});

    waitUntil(Promise.reject(new Error("eager")));

    // flush microtasks so .catch runs
    await vi.waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Background job failed:",
        expect.objectContaining({ message: "eager" })
      );
    });
  });

  it("removes resolved promise from pending via finally", async ({
    expect,
  }) => {
    waitUntil(Promise.resolve("done"));

    // flush microtasks so .finally runs
    await vi.waitFor(async () => {
      await expect(waitForAll()).resolves.toBeUndefined();
    });
  });

  it("removes rejected promise from pending via finally", async ({
    expect,
  }) => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    waitUntil(Promise.reject(new Error("gone")));

    // flush microtasks so .catch + .finally run
    await vi.waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Background job failed:",
        expect.objectContaining({ message: "gone" })
      );
    });
    await expect(waitForAll()).resolves.toBeUndefined();
  });

  it("warns when pending exceeds threshold, resets flag after drain", async ({
    expect,
  }) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    for (let i = 0; i < 1_001; i++) {
      waitUntil(Promise.resolve(i));
    }

    expect(console.warn).toHaveBeenCalledTimes(1);

    await waitForAll();
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("does not warn below threshold", async ({ expect }) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    for (let i = 0; i < 999; i++) {
      waitUntil(Promise.resolve(i));
    }

    expect(console.warn).not.toHaveBeenCalled();
    await waitForAll();
  });
});
