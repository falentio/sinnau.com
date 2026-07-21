import * as v from "valibot";
import { describe, it } from "vitest";

import {
  AI_LIMIT_DEFAULT_DAILY_LIMIT,
  AI_LIMIT_DEFAULT_PLAN_KEY,
  AI_LIMIT_DEFAULT_WEEKLY_LIMIT,
  AI_LIMIT_MAX_PER_REQUEST,
} from "./ai-limit.constant.ts";
import {
  aiLimitUsageSchema,
  aiLimitWindowSchema,
  consumeAiLimitInputSchema,
  consumeAiLimitOutputSchema,
  getAiLimitUsageInputSchema,
  refundAiLimitInputSchema,
  refundAiLimitOutputSchema,
} from "./ai-limit.ts";

const validId = "aiu_te0000000000000001";
const invalidPrefixId = "bog_te0000000000000001";
const tooShortId = "aiu_short";
const tooLongId = "aiu_te0000000000000001extra";
const specialCharsId = "aiu_te00!!!!0000000001";

const validConsumeInput = {
  amount: 1,
  featureKey: "generate",
};

const validRefundInput = {
  logId: validId,
};

describe.concurrent("consumeAiLimitInputSchema (validation)", () => {
  it("accepts a positive integer amount", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      amount: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts amount equal to daily limit", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      amount: AI_LIMIT_DEFAULT_DAILY_LIMIT,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative amount", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      amount: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects fractional amount", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      amount: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects amount exceeding max per request", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      amount: AI_LIMIT_MAX_PER_REQUEST + 1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts amount equal to max per request", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      amount: AI_LIMIT_MAX_PER_REQUEST,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a non-empty featureKey", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      featureKey: "generate",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty featureKey", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      featureKey: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only featureKey", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      featureKey: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects featureKey longer than 64 characters", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      featureKey: "a".repeat(65),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing featureKey", ({ expect }) => {
    const { featureKey: _, ...withoutKey } = validConsumeInput;
    const result = v.safeParse(consumeAiLimitInputSchema, withoutKey);
    expect(result.success).toBe(false);
  });

  it("rejects missing amount", ({ expect }) => {
    const { amount: _, ...withoutAmount } = validConsumeInput;
    const result = v.safeParse(consumeAiLimitInputSchema, withoutAmount);
    expect(result.success).toBe(false);
  });

  it("accepts a valid referenceId", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      referenceId: "gen_ref_123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects referenceId longer than 256 characters", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      referenceId: "a".repeat(257),
    });
    expect(result.success).toBe(false);
  });

  it("accepts undefined referenceId", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null referenceId", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      referenceId: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty string referenceId", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      referenceId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only referenceId", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitInputSchema, {
      ...validConsumeInput,
      referenceId: "   ",
    });
    expect(result.success).toBe(false);
  });
});

describe.concurrent("refundAiLimitInputSchema (validation)", () => {
  it("accepts a valid logId", ({ expect }) => {
    const result = v.safeParse(refundAiLimitInputSchema, validRefundInput);
    expect(result.success).toBe(true);
  });

  it("rejects logId with wrong prefix", ({ expect }) => {
    const result = v.safeParse(refundAiLimitInputSchema, {
      logId: invalidPrefixId,
    });
    expect(result.success).toBe(false);
  });

  it("rejects logId that is too short", ({ expect }) => {
    const result = v.safeParse(refundAiLimitInputSchema, {
      logId: tooShortId,
    });
    expect(result.success).toBe(false);
  });

  it("rejects logId that is too long", ({ expect }) => {
    const result = v.safeParse(refundAiLimitInputSchema, {
      logId: tooLongId,
    });
    expect(result.success).toBe(false);
  });

  it("rejects logId with special characters", ({ expect }) => {
    const result = v.safeParse(refundAiLimitInputSchema, {
      logId: specialCharsId,
    });
    expect(result.success).toBe(false);
  });
});

describe.concurrent("getAiLimitUsageInputSchema (validation)", () => {
  it("accepts empty input", ({ expect }) => {
    const result = v.safeParse(getAiLimitUsageInputSchema, {});
    expect(result.success).toBe(true);
  });
});

describe.concurrent("aiLimitWindowSchema (validation)", () => {
  it("accepts valid window data", ({ expect }) => {
    const result = v.safeParse(aiLimitWindowSchema, {
      limit: 5000,
      remaining: 4999,
      resetsAt: new Date(),
      used: 1,
    });
    expect(result.success).toBe(true);
  });
});

describe.concurrent("aiLimitUsageSchema (validation)", () => {
  it("accepts valid usage data", ({ expect }) => {
    const result = v.safeParse(aiLimitUsageSchema, {
      daily: {
        limit: 5000,
        remaining: 4999,
        resetsAt: new Date(),
        used: 1,
      },
      planKey: AI_LIMIT_DEFAULT_PLAN_KEY,
      weekly: {
        limit: AI_LIMIT_DEFAULT_WEEKLY_LIMIT,
        remaining: AI_LIMIT_DEFAULT_WEEKLY_LIMIT,
        resetsAt: new Date(),
        used: 0,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe.concurrent("consumeAiLimitOutputSchema (validation)", () => {
  it("accepts valid consume output", ({ expect }) => {
    const result = v.safeParse(consumeAiLimitOutputSchema, {
      logId: validId,
      usage: {
        daily: {
          limit: 5000,
          remaining: 4999,
          resetsAt: new Date(),
          used: 1,
        },
        planKey: AI_LIMIT_DEFAULT_PLAN_KEY,
        weekly: {
          limit: AI_LIMIT_DEFAULT_WEEKLY_LIMIT,
          remaining: AI_LIMIT_DEFAULT_WEEKLY_LIMIT,
          resetsAt: new Date(),
          used: 0,
        },
      },
    });
    expect(result.success).toBe(true);
  });
});

describe.concurrent("refundAiLimitOutputSchema (validation)", () => {
  it("accepts valid refund output", ({ expect }) => {
    const result = v.safeParse(refundAiLimitOutputSchema, {
      refundedLogId: validId,
      usage: {
        daily: {
          limit: 5000,
          remaining: 5000,
          resetsAt: new Date(),
          used: 0,
        },
        planKey: AI_LIMIT_DEFAULT_PLAN_KEY,
        weekly: {
          limit: AI_LIMIT_DEFAULT_WEEKLY_LIMIT,
          remaining: AI_LIMIT_DEFAULT_WEEKLY_LIMIT,
          resetsAt: new Date(),
          used: 0,
        },
      },
    });
    expect(result.success).toBe(true);
  });
});
