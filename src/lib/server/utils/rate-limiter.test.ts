import { afterEach, describe, expect, it, vi } from "vitest";

import { TokenBucketRateLimiter } from "./rate-limiter.ts";

describe(TokenBucketRateLimiter, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("consume", () => {
    it("allows consumption when bucket is at capacity", () => {
      const limiter = new TokenBucketRateLimiter({
        capacity: 10,
        refillInterval: 1000,
        refillRate: 10,
      });

      const result = limiter.consume("key-a");

      expect(result.allowed).toBeTruthy();
      expect(result.remaining).toBe(9);
      expect(result.reset).toBeGreaterThan(0);
    });

    it("denies consumption when exhausted", () => {
      const limiter = new TokenBucketRateLimiter({
        capacity: 10,
        refillInterval: 1000,
        refillRate: 10,
      });

      for (let i = 0; i < 10; i += 1) {
        limiter.consume("key-a");
      }

      const result = limiter.consume("key-a");

      expect(result.allowed).toBeFalsy();
      expect(result.remaining).toBe(0);
      expect(result.reset).toBeGreaterThan(0);
    });

    it("refills tokens over time", () => {
      vi.useFakeTimers();
      const limiter = new TokenBucketRateLimiter({
        capacity: 10,
        refillInterval: 1000,
        refillRate: 10,
      });

      for (let i = 0; i < 10; i += 1) {
        limiter.consume("key-a");
      }

      expect(limiter.consume("key-a").allowed).toBeFalsy();

      vi.advanceTimersByTime(500);
      const result = limiter.consume("key-a");

      expect(result.allowed).toBeTruthy();
      expect(result.remaining).toBe(4);
      expect(result.reset).toBe(600);
    });

    it("supports custom cost per consume call", () => {
      const limiter = new TokenBucketRateLimiter({
        capacity: 10,
        refillInterval: 1000,
        refillRate: 10,
      });

      const result = limiter.consume("key-a", 3);

      expect(result.allowed).toBeTruthy();
      expect(result.remaining).toBe(7);
    });

    it("caps refill at capacity after long idle", () => {
      vi.useFakeTimers();
      const limiter = new TokenBucketRateLimiter({
        capacity: 10,
        refillInterval: 1000,
        refillRate: 10,
      });

      limiter.consume("key-a");
      vi.advanceTimersByTime(3_600_000);

      const result = limiter.consume("key-a");

      expect(result.allowed).toBeTruthy();
      expect(result.remaining).toBe(9);
    });

    it("maintains independent buckets for different keys", () => {
      const limiter = new TokenBucketRateLimiter({
        capacity: 5,
        refillInterval: 1000,
        refillRate: 5,
      });

      for (let i = 0; i < 5; i += 1) {
        limiter.consume("key-a");
      }

      expect(limiter.consume("key-a").allowed).toBeFalsy();
      expect(limiter.consume("key-b").allowed).toBeTruthy();
    });
  });
});
