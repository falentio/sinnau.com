import * as v from "valibot";

import {
  AI_LIMIT_ID_PREFIX,
  AI_LIMIT_MAX_PER_REQUEST,
} from "./ai-limit.constant.ts";
import { createPrefixedIdSchema } from "./id-schema.ts";

const aiuIdSchema = createPrefixedIdSchema(AI_LIMIT_ID_PREFIX);

const aiLimitAmountSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1, "Amount must be at least 1"),
  v.maxValue(
    AI_LIMIT_MAX_PER_REQUEST,
    `Amount must be at most ${AI_LIMIT_MAX_PER_REQUEST}`
  )
);

const aiLimitFeatureKeySchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Feature key must not be empty"),
  v.maxLength(64, "Feature key must be at most 64 characters")
);

export const aiLimitWindowSchema = v.object({
  limit: v.number(),
  remaining: v.number(),
  resetsAt: v.date(),
  used: v.number(),
});

export const aiLimitUsageSchema = v.object({
  daily: aiLimitWindowSchema,
  planKey: v.string(),
  weekly: aiLimitWindowSchema,
});

export const getAiLimitUsageInputSchema = v.object({});

export const consumeAiLimitInputSchema = v.object({
  amount: aiLimitAmountSchema,
  featureKey: aiLimitFeatureKeySchema,
  referenceId: v.nullish(
    v.pipe(
      v.string(),
      v.trim(),
      v.minLength(1, "Reference ID must not be empty"),
      v.maxLength(256)
    )
  ),
});

export const consumeAiLimitOutputSchema = v.object({
  logId: aiuIdSchema,
  usage: aiLimitUsageSchema,
});

export const refundAiLimitInputSchema = v.object({
  logId: aiuIdSchema,
});

export const refundAiLimitOutputSchema = v.object({
  refundedLogId: aiuIdSchema,
  usage: aiLimitUsageSchema,
});

export type AiLimitUsage = v.InferOutput<typeof aiLimitUsageSchema>;
export type GetAiLimitUsageInput = v.InferOutput<
  typeof getAiLimitUsageInputSchema
>;
export type ConsumeAiLimitInput = v.InferOutput<
  typeof consumeAiLimitInputSchema
>;
export type ConsumeAiLimitOutput = v.InferOutput<
  typeof consumeAiLimitOutputSchema
>;
export type RefundAiLimitInput = v.InferOutput<typeof refundAiLimitInputSchema>;
export type RefundAiLimitOutput = v.InferOutput<
  typeof refundAiLimitOutputSchema
>;
