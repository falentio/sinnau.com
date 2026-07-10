import * as v from "valibot";

import { createPrefixedIdSchema } from "./id-schema.ts";
import {
  ORDER_ID_PREFIX,
  ORDER_STATUSES,
  PAYMENT_ID_PREFIX,
  PAYMENT_STATUSES,
  PLAN_DURATIONS,
  PLAN_KEYS,
} from "./plan.constant.ts";

const planKeySchema = v.picklist(PLAN_KEYS);
const planDurationSchema = v.picklist(PLAN_DURATIONS);
const orderIdSchema = createPrefixedIdSchema(ORDER_ID_PREFIX);
const paymentIdSchema = createPrefixedIdSchema(PAYMENT_ID_PREFIX);

const orderStatusSchema = v.picklist(ORDER_STATUSES);
const paymentStatusSchema = v.picklist(PAYMENT_STATUSES);

export const queryParamIntegerSchema = v.pipe(
  v.union([v.string(), v.number()]),
  v.transform((input) => (typeof input === "string" ? Number(input) : input)),
  v.integer(),
  v.minValue(1)
);

const pageSchema = v.optional(queryParamIntegerSchema, 1);

// ─── Checkout ─────────────────────────────────────────────────────────

export const checkoutInputSchema = v.object({
  durationMonths: planDurationSchema,
  planKey: planKeySchema,
});
export type CheckoutInput = v.InferOutput<typeof checkoutInputSchema>;

export const checkoutOutputSchema = v.object({
  currency: v.literal("IDR"),
  expiresAt: v.string(),
  grossAmount: v.number(),
  orderId: orderIdSchema,
  paymentData: v.object({
    actions: v.array(
      v.object({
        method: v.string(),
        name: v.string(),
        url: v.string(),
      })
    ),
    qrString: v.string(),
  }),
  paymentType: v.literal("QRIS"),
});
export type CheckoutOutput = v.InferOutput<typeof checkoutOutputSchema>;

// ─── List orders ──────────────────────────────────────────────────────

export const listOrdersInputSchema = v.object({ page: pageSchema });
export type ListOrdersInput = v.InferOutput<typeof listOrdersInputSchema>;

export const orderSchema = v.object({
  createdAt: v.date(),
  durationMonths: planDurationSchema,
  expiresAt: v.nullable(v.date()),
  grossAmount: v.number(),
  id: orderIdSchema,
  planKey: planKeySchema,
  sku: v.string(),
  status: orderStatusSchema,
  updatedAt: v.date(),
  userId: v.string(),
});
export type Order = v.InferOutput<typeof orderSchema>;

export const listOrdersOutputSchema = v.object({
  data: v.array(orderSchema),
  pagination: v.object({
    limit: v.number(),
    page: v.number(),
    total: v.number(),
    totalPages: v.number(),
  }),
});
export type ListOrdersOutput = v.InferOutput<typeof listOrdersOutputSchema>;

// ─── List plans (public catalog) ─────────────────────────────────────

export const planCatalogDurationSchema = v.object({
  discountLabel: v.string(),
  grossAmount: v.number(),
  months: planDurationSchema,
});
export type PlanCatalogDuration = v.InferOutput<
  typeof planCatalogDurationSchema
>;

export const planCatalogItemSchema = v.object({
  benefits: v.array(v.string()),
  durations: v.array(planCatalogDurationSchema),
  key: planKeySchema,
  monthlyPrice: v.number(),
  name: v.string(),
});
export type PlanCatalogItem = v.InferOutput<typeof planCatalogItemSchema>;

export const listPlansOutputSchema = v.array(planCatalogItemSchema);
export type ListPlansOutput = v.InferOutput<typeof listPlansOutputSchema>;

// ─── AI-limit plan lookup ─────────────────────────────────────────────

export const getAiLimitPlanForUserOutputSchema = v.object({
  daily: v.number(),
  planKey: planKeySchema,
  weekly: v.number(),
});
export type GetAiLimitPlanForUserOutput = v.InferOutput<
  typeof getAiLimitPlanForUserOutputSchema
>;

// Re-export shared primitives for callers that need them
export {
  orderIdSchema,
  paymentIdSchema,
  paymentStatusSchema,
  planDurationSchema,
  planKeySchema,
};
