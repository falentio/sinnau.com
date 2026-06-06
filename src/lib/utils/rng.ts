export class Rng {
  // oxlint-disable-next-line no-bitwise, unicorn/prefer-math-trunc
  private static readonly MAX_U32 = -1 >>> 0;

  private state!: number;

  constructor(seed: string) {
    this.initialize(seed);
  }

  initialize(seed: string): void {
    this.state = Rng.hashSeed(seed);
    if (this.state === 0) {
      this.state = 1;
    }
  }

  private static hashSeed(seed: string): number {
    let h = 5381;
    for (let i = 0; i < seed.length; i += 1) {
      // oxlint-disable-next-line no-bitwise
      h = Math.trunc((h << 5) + h) ^ (seed.codePointAt(i) ?? 0);
    }
    return h;
  }

  private step(): number {
    let x = this.state;
    // oxlint-disable-next-line no-bitwise
    x ^= x << 13;
    // oxlint-disable-next-line no-bitwise
    x ^= x >>> 17;
    // oxlint-disable-next-line no-bitwise
    x ^= x << 5;
    // oxlint-disable-next-line no-bitwise, unicorn/prefer-math-trunc
    this.state = x >>> 0;
    return this.state;
  }

  uint32(): number {
    return this.step();
  }

  int31(): number {
    // oxlint-disable-next-line no-bitwise
    return this.step() & (Rng.MAX_U32 >>> 1);
  }

  intn(n: number): number {
    const range = Rng.MAX_U32 + 1;
    if (!Number.isInteger(n) || n < 1 || n > range) {
      throw new Error(
        `intn: argument must be an integer in [1, 2^32], got ${n}`
      );
    }
    if (n === 1) {
      return 0;
    }
    // oxlint-disable-next-line no-bitwise
    if ((n & (n - 1)) === 0) {
      // oxlint-disable-next-line no-bitwise
      return this.step() & (n - 1);
    }
    const limit = Math.floor(range / n) * n;
    let v: number;
    do {
      v = this.step();
    } while (v >= limit);
    return v % n;
  }

  range(max: number, min = 0): number {
    if (!Number.isInteger(max) || !Number.isInteger(min)) {
      throw new TypeError(
        `range: arguments must be integers, got min=${min}, max=${max}`
      );
    }
    if (max <= min) {
      throw new Error(
        `range: max must be greater than min, got min=${min}, max=${max}`
      );
    }
    return min + this.intn(max - min);
  }

  float(): number {
    return this.step() / Rng.MAX_U32;
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = this.intn(i + 1);
      const vi = result[i];
      const vj = result[j];
      if (vi === undefined || vj === undefined) {
        continue;
      }
      result[i] = vj;
      result[j] = vi;
    }
    return result;
  }
}

export const createRng = (seed: string) => new Rng(seed);
