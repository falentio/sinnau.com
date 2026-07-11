import { describe, it } from "vitest";

import { computePollIntervalMs, POLL_BASE_MS } from "./checkout-poll.ts";

describe.concurrent(computePollIntervalMs, () => {
  it("returns POLL_BASE_MS when createdAt is now", async ({ expect }) => {
    const now = new Date();
    expect(computePollIntervalMs(now)).toBe(POLL_BASE_MS);
  });

  it("doubles to 2x base when 1 minute has elapsed", async ({ expect }) => {
    const createdAt = new Date(Date.now() - 60_000);
    expect(computePollIntervalMs(createdAt)).toBe(POLL_BASE_MS * 2);
  });

  it("scales to 6x base after 5 minutes", async ({ expect }) => {
    const createdAt = new Date(Date.now() - 5 * 60_000);
    expect(computePollIntervalMs(createdAt)).toBe(POLL_BASE_MS * 6);
  });

  it("scales to 15x base (75s) at the 14-minute mark", async ({ expect }) => {
    const createdAt = new Date(Date.now() - 14 * 60_000);
    expect(computePollIntervalMs(createdAt)).toBe(POLL_BASE_MS * 15);
  });
});
