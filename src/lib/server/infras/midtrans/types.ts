import * as v from "valibot";

export const QRIS_ACQUIRERS = ["gopay", "airpay shopee"] as const;

const qrisAcquirerSchema = v.picklist(QRIS_ACQUIRERS);

// ─── Input schemas ──────────────────────────────────────────────────

export const createQrisInputSchema = v.object({
  custom_expiry: v.optional(
    v.object({
      expiry_duration: v.number(),
      order_time: v.optional(v.string()),
      unit: v.pipe(v.string(), v.minLength(1)),
    })
  ),
  customer_details: v.optional(
    v.object({
      email: v.optional(v.string()),
      first_name: v.optional(v.string()),
      last_name: v.optional(v.string()),
      phone: v.optional(v.string()),
    })
  ),
  item_details: v.optional(
    v.array(
      v.object({
        id: v.optional(v.string()),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
      })
    )
  ),
  payment_type: v.literal("qris"),
  qris: v.optional(
    v.object({
      acquirer: v.optional(qrisAcquirerSchema),
    })
  ),
  transaction_details: v.object({
    gross_amount: v.number(),
    order_id: v.string(),
  }),
});

// ─── Response schemas ───────────────────────────────────────────────

export const qrisActionSchema = v.object({
  method: v.string(),
  name: v.string(),
  url: v.string(),
});

export const qrisChargeResponseSchema = v.object({
  acquirer: v.string(),
  actions: v.array(qrisActionSchema),
  currency: v.string(),
  fraud_status: v.string(),
  gross_amount: v.string(),
  merchant_id: v.string(),
  order_id: v.string(),
  payment_type: v.string(),
  status_code: v.string(),
  status_message: v.string(),
  transaction_id: v.string(),
  transaction_status: v.string(),
  transaction_time: v.string(),
});

// ─── Webhook body (QRIS) ────────────────────────────────────────────

export const webhookBodySchema = v.object({
  acquirer: v.string(),
  currency: v.string(),
  fraud_status: v.string(),
  gross_amount: v.string(),
  issuer: v.optional(v.string()),
  merchant_cross_reference_id: v.optional(v.string()),
  merchant_id: v.string(),
  order_id: v.string(),
  payment_type: v.string(),
  reference_id: v.optional(v.string()),
  settlement_time: v.optional(v.string()),
  shopeepay_reference_number: v.optional(v.string()),
  signature_key: v.string(),
  status_code: v.string(),
  status_message: v.string(),
  transaction_id: v.string(),
  transaction_status: v.string(),
  transaction_time: v.string(),
  transaction_type: v.optional(v.string()),
});

// ─── Get Status response (QRIS) ─────────────────────────────────────

export const transactionStatusSchema = v.object({
  acquirer: v.optional(v.string()),
  currency: v.string(),
  expiry_time: v.optional(v.string()),
  fraud_status: v.string(),
  gross_amount: v.string(),
  issuer: v.optional(v.string()),
  merchant_cross_reference_id: v.optional(v.string()),
  merchant_id: v.string(),
  order_id: v.string(),
  payment_type: v.string(),
  reference_id: v.optional(v.string()),
  settlement_time: v.optional(v.string()),
  shopeepay_reference_number: v.optional(v.string()),
  signature_key: v.optional(v.string()),
  status_code: v.string(),
  status_message: v.string(),
  transaction_id: v.string(),
  transaction_status: v.string(),
  transaction_time: v.string(),
  transaction_type: v.optional(v.string()),
});

// ─── Inferred types ─────────────────────────────────────────────────

export type CreateQrisInput = v.InferOutput<typeof createQrisInputSchema>;
export type QrisAction = v.InferOutput<typeof qrisActionSchema>;
export type QrisChargeResponse = v.InferOutput<typeof qrisChargeResponseSchema>;
export type WebhookBody = v.InferOutput<typeof webhookBodySchema>;
export type TransactionStatus = v.InferOutput<typeof transactionStatusSchema>;
