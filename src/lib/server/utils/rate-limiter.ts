import QuickLRU from "quick-lru";

interface Bucket {
  lastRefill: number;
  tokens: number;
}

export interface TokenBucketOptions {
  capacity: number;
  maxAge?: number;
  maxSize?: number;
  refillInterval: number;
  refillRate: number;
}

export interface ConsumeResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

export class TokenBucketRateLimiter {
  private readonly buckets: QuickLRU<string, Bucket>;
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly refillInterval: number;

  constructor(opts: TokenBucketOptions) {
    this.capacity = opts.capacity;
    this.refillRate = opts.refillRate;
    this.refillInterval = opts.refillInterval;
    this.buckets = new QuickLRU<string, Bucket>({
      maxAge: opts.maxAge ?? 300_000,
      maxSize: opts.maxSize ?? 10_000,
    });
  }

  consume(key: string, cost = 1): ConsumeResult {
    const now = Date.now();
    const bucket = this.getOrCreateBucket(key, now);
    this.refillBucket(bucket, now);
    return this.tryConsume(bucket, cost);
  }

  private getOrCreateBucket(key: string, now: number): Bucket {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { lastRefill: now, tokens: this.capacity };
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  private refillBucket(bucket: Bucket, now: number): void {
    const elapsed = now - bucket.lastRefill;
    if (elapsed <= 0) {
      return;
    }
    const refillAmount = (elapsed / this.refillInterval) * this.refillRate;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + refillAmount);
    bucket.lastRefill = now;
  }

  private tryConsume(bucket: Bucket, cost: number): ConsumeResult {
    if (bucket.tokens < cost) {
      const needed = cost - bucket.tokens;
      const msUntilReset = Math.ceil(
        (needed / this.refillRate) * this.refillInterval
      );
      return { allowed: false, remaining: 0, reset: msUntilReset };
    }

    bucket.tokens -= cost;
    const tokensToRefill = this.capacity - bucket.tokens;
    const msUntilFull = Math.ceil(
      (tokensToRefill / this.refillRate) * this.refillInterval
    );
    return { allowed: true, remaining: bucket.tokens, reset: msUntilFull };
  }
}
