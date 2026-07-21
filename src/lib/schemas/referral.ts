import * as v from "valibot";

import { createPrefixedIdSchema } from "./id-schema.ts";
import { REFERRAL_ID_PREFIX } from "./referral.constant.ts";

export { REFERRAL_ID_PREFIX };

const _referralIdSchema = createPrefixedIdSchema(REFERRAL_ID_PREFIX);

const _userIdSchema = v.pipe(v.string(), v.trim(), v.nonEmpty());

const _nonEmptyStringSchema = v.pipe(v.string(), v.trim(), v.nonEmpty());

const _positiveSafeIntegerSchema = v.pipe(
  v.number(),
  v.integer(),
  v.safeInteger(),
  v.minValue(1)
);

const _safeIntegerSchema = v.pipe(v.number(), v.integer(), v.safeInteger());

const slugSchema = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty(),
  v.maxLength(255),
  v.regex(
    /^[a-z0-9-]+$/u,
    "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung"
  )
);

// ── oRPC procedure input schemas ──

export const getOrCreateReferralProfileInputSchema = v.object({});

export const resolveReferralSlugInputSchema = v.object({
  slug: slugSchema,
});

// ── Output schemas ──

export const referralProfileSchema = v.object({
  createdAt: v.date(),
  id: v.string(),
  points: v.number(),
  slug: v.string(),
  updatedAt: v.date(),
  userId: v.string(),
  version: v.number(),
});

export const referralRelationshipSchema = v.object({
  createdAt: v.date(),
  id: v.string(),
  referredUserId: v.string(),
  referrerUserId: v.string(),
});

export const referralSubscriptionEventSchema = v.object({
  createdAt: v.date(),
  id: v.string(),
  idempotencyKey: v.string(),
  pointsAwarded: v.number(),
  referredUserId: v.nullable(v.string()),
  referrerUserId: v.string(),
  relationshipId: v.nullable(v.string()),
});

// ── Inferred input types ──

export type GetOrCreateReferralProfileInput = v.InferOutput<
  typeof getOrCreateReferralProfileInputSchema
>;
export type ResolveReferralSlugInput = v.InferOutput<
  typeof resolveReferralSlugInputSchema
>;
