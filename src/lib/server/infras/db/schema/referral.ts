import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema.ts";

export const referralProfile = sqliteTable(
  "referral_profile",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text("id").primaryKey(),
    points: integer("points").notNull().default(0),
    slug: text("slug").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    uniqueIndex("referral_profile_userId_unique").on(table.userId),
    uniqueIndex("referral_profile_slug_unique").on(sql`lower(${table.slug})`),
    index("referral_profile_slug_idx").on(table.slug),
  ]
);

export const referralRelationship = sqliteTable(
  "referral_relationship",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text("id").primaryKey(),
    referredUserId: text("referred_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    referrerUserId: text("referrer_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("referral_relationship_referredUserId_unique").on(
      table.referredUserId
    ),
    index("referral_relationship_referrerUserId_idx").on(table.referrerUserId),
  ]
);

export const referralSubscriptionEvent = sqliteTable(
  "referral_subscription_event",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text("id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    pointsAwarded: integer("points_awarded").notNull(),
    referredUserId: text("referred_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    referrerUserId: text("referrer_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    relationshipId: text("relationship_id").references(
      () => referralRelationship.id,
      { onDelete: "cascade" }
    ),
  },
  (table) => [
    uniqueIndex("referral_subscription_event_idempotencyKey_unique").on(
      table.idempotencyKey
    ),
    index("referral_subscription_event_referrerUserId_idx").on(
      table.referrerUserId
    ),
    index("referral_subscription_event_referredUserId_idx").on(
      table.referredUserId
    ),
    index("referral_subscription_event_relationshipId_idx").on(
      table.relationshipId
    ),
  ]
);

export type ReferralProfile = typeof referralProfile.$inferSelect;
export type InsertReferralProfile = typeof referralProfile.$inferInsert;
export type ReferralRelationship = typeof referralRelationship.$inferSelect;
export type InsertReferralRelationship =
  typeof referralRelationship.$inferInsert;
export type ReferralSubscriptionEvent =
  typeof referralSubscriptionEvent.$inferSelect;
export type InsertReferralSubscriptionEvent =
  typeof referralSubscriptionEvent.$inferInsert;
