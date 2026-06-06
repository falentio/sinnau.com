import { describe, it, expect } from "vitest";

import { Rng } from "./rng";

describe(Rng, () => {
  describe("determinism", () => {
    it("produces same sequence for same seed", () => {
      const a = new Rng("hello");
      const b = new Rng("hello");
      for (let i = 0; i < 100; i += 1) {
        expect(a.uint32()).toBe(b.uint32());
      }
    });

    it("produces different sequences for different seeds", () => {
      const a = new Rng("alpha");
      const b = new Rng("beta");
      let identical = true;
      for (let i = 0; i < 20; i += 1) {
        if (a.uint32() !== b.uint32()) {
          identical = false;
          break;
        }
      }
      expect(identical).toBeFalsy();
    });
  });

  describe("uint32", () => {
    it("returns non-negative integers in [0, 2^32)", () => {
      const r = new Rng("range");
      for (let i = 0; i < 1000; i += 1) {
        const v = r.uint32();
        expect(Number.isInteger(v)).toBeTruthy();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(0x1_00_00_00_00);
      }
    });
  });

  describe("int31", () => {
    it("returns non-negative integers in [0, 2^31)", () => {
      const r = new Rng("range");
      for (let i = 0; i < 1000; i += 1) {
        const v = r.int31();
        expect(Number.isInteger(v)).toBeTruthy();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(0x80_00_00_00);
      }
    });
  });

  describe("intn", () => {
    it("returns integers in [0, n)", () => {
      const r = new Rng("range");
      const n = 100;
      for (let i = 0; i < 1000; i += 1) {
        const v = r.intn(n);
        expect(Number.isInteger(v)).toBeTruthy();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(n);
      }
    });

    it("intn(1) always returns 0", () => {
      const r = new Rng("range");
      for (let i = 0; i < 100; i += 1) {
        expect(r.intn(1)).toBe(0);
      }
    });

    it("throws on invalid n", () => {
      const r = new Rng("range");
      expect(() => r.intn(0)).toThrow(
        "intn: argument must be an integer in [1, 2^32]"
      );
      expect(() => r.intn(-1)).toThrow(
        "intn: argument must be an integer in [1, 2^32]"
      );
      expect(() => r.intn(1.5)).toThrow(
        "intn: argument must be an integer in [1, 2^32]"
      );
      expect(() => r.intn(0x1_00_00_00_01)).toThrow(
        "intn: argument must be an integer in [1, 2^32]"
      );
    });

    it("approximates uniform distribution", () => {
      const r = new Rng("uniformity");
      const n = 10;
      const trials = 100_000;
      const counts = Array.from({ length: n }, () => 0);
      for (let i = 0; i < trials; i += 1) {
        const idx = r.intn(n);
        counts[idx] = (counts[idx] ?? 0) + 1;
      }
      const expected = trials / n;
      for (let i = 0; i < n; i += 1) {
        expect(counts[i]).toBeGreaterThan(expected * 0.8);
        expect(counts[i]).toBeLessThan(expected * 1.2);
      }
    });

    it("handles power-of-2 n", () => {
      const r = new Rng("range");
      for (let i = 0; i < 1000; i += 1) {
        const v = r.intn(8);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(8);
      }
    });
  });

  describe("range", () => {
    it("returns integers in [min, max)", () => {
      const r = new Rng("range-test");
      for (let i = 0; i < 1000; i += 1) {
        const v = r.range(10, 5);
        expect(Number.isInteger(v)).toBeTruthy();
        expect(v).toBeGreaterThanOrEqual(5);
        expect(v).toBeLessThan(10);
      }
    });

    it("defaults min to 0", () => {
      const r = new Rng("range-test");
      for (let i = 0; i < 1000; i += 1) {
        const v = r.range(100);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(100);
      }
    });

    it("throws when max <= min", () => {
      const r = new Rng("range-test");
      expect(() => r.range(5, 5)).toThrow(
        "range: max must be greater than min"
      );
      expect(() => r.range(3, 5)).toThrow(
        "range: max must be greater than min"
      );
    });

    it("throws on non-integer arguments", () => {
      const r = new Rng("range-test");
      expect(() => r.range(1.5)).toThrow("range: arguments must be integers");
      expect(() => r.range(10, 0.5)).toThrow(
        "range: arguments must be integers"
      );
    });
  });

  describe("float", () => {
    it("returns values in [0, 1)", () => {
      const r = new Rng("range");
      for (let i = 0; i < 1000; i += 1) {
        const v = r.float();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });

  describe("shuffle", () => {
    it("returns a new array, does not mutate input", () => {
      const r = new Rng("shuffle");
      const input = [1, 2, 3, 4, 5];
      const copy = [...input];
      const out = r.shuffle(input);
      expect(input).toStrictEqual(copy);
      expect(out).not.toBe(input);
    });

    it("preserves all elements (permutation)", () => {
      const r = new Rng("shuffle");
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const out = r.shuffle(input);
      expect(out).toHaveLength(input.length);
      expect([...out].toSorted((a, b) => a - b)).toStrictEqual(input);
    });

    it("works with strings", () => {
      const r = new Rng("shuffle");
      const out = r.shuffle(["a", "b", "c", "d"]);
      expect([...out].toSorted()).toStrictEqual(["a", "b", "c", "d"]);
    });

    it("handles empty array", () => {
      const r = new Rng("shuffle");
      expect(r.shuffle([])).toStrictEqual([]);
    });

    it("handles single element", () => {
      const r = new Rng("shuffle");
      expect(r.shuffle([42])).toStrictEqual([42]);
    });

    it("changes order most of the time", () => {
      const r = new Rng("shuffle");
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      let changed = false;
      for (let i = 0; i < 10; i += 1) {
        const out = r.shuffle(input);
        if (out.some((v, idx) => v !== input[idx])) {
          changed = true;
          break;
        }
      }
      expect(changed).toBeTruthy();
    });
  });

  describe("seeding", () => {
    it("handles empty string seed", () => {
      const r = new Rng("");
      const v = r.uint32();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(0x1_00_00_00_00);
    });

    it("handles unicode seed", () => {
      const r = new Rng("こんにちは");
      const v = r.uint32();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(0x1_00_00_00_00);
    });

    it("re-seed via initialize resets sequence", () => {
      const r = new Rng("first");
      const a = r.uint32();
      const b = r.uint32();
      r.initialize("first");
      expect(r.uint32()).toBe(a);
      expect(r.uint32()).toBe(b);
    });

    it("state never becomes zero", () => {
      const r = new Rng("");
      for (let i = 0; i < 1000; i += 1) {
        expect(r.uint32()).not.toBe(0);
      }
    });
  });
});
