import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema.ts";

/* oxlint-disable typescript/no-unsafe-member-access, typescript/no-unsafe-return -- Drizzle column reference */
export const affiliateProfile = sqliteTable("affiliate_profile", {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  id: text("id").primaryKey(),
  nameSnapshot: text("name_snapshot").notNull(),
  points: real("points").notNull().default(0),
  slug: text("slug").notNull().unique(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
});

export const affiliatePayout = sqliteTable("affiliate_payout", {
  affiliateUserId: text("affiliate_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  id: text("id").primaryKey(),
  method: text("method"),
  note: text("note"),
  processedByAdminId: text("processed_by_admin_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  reference: text("reference"),
});

export const affiliateCommission = sqliteTable(
  "affiliate_commission",
  {
    affiliateUserId: text("affiliate_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    commissionAmount: real("commission_amount").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text("id").primaryKey(),
    payoutId: text("payout_id").references(() => affiliatePayout.id, {
      onDelete: "set null",
    }),
    purchaseAmount: real("purchase_amount").notNull(),
    purchaserUserId: text("purchaser_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["PENDING", "PAID", "VOID"] })
      .notNull()
      .default("PENDING"),
    transactionId: text("transaction_id").notNull().unique(),
  },
  (table) => [
    index("affiliate_commission_user_status_idx").on(
      table.affiliateUserId,
      table.status
    ),
  ]
);

export const affiliateApplication = sqliteTable(
  "affiliate_application",
  {
    advantage: text("advantage").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text("id").primaryKey(),
    instagramHandle: text("instagram_handle"),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
    reviewedByAdminId: text("reviewed_by_admin_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: ["PENDING", "ACCEPTED", "REJECTED"] })
      .notNull()
      .default("PENDING"),
    tiktokHandle: text("tiktok_handle"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    youtubeHandle: text("youtube_handle"),
  },
  (table) => [
    index("affiliate_application_user_status_idx").on(
      table.userId,
      table.status
    ),
  ]
);

export const affiliatePayoutAccount = sqliteTable("affiliate_payout_account", {
  accountHolderName: text("account_holder_name").notNull(),
  accountNumber: text("account_number").notNull(),
  bankName: text("bank_name"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  id: text("id").primaryKey(),
  method: text("method", { enum: ["GOPAY", "BANK"] }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const affiliateSubscriptionEvent = sqliteTable(
  "affiliate_subscription_event",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text("id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    pointsAwarded: real("points_awarded").notNull(),
    referredUserId: text("referred_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    referrerUserId: text("referrer_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
  }
);

export type AffiliateProfile = typeof affiliateProfile.$inferSelect;
export type AffiliatePayout = typeof affiliatePayout.$inferSelect;
export type AffiliateCommission = typeof affiliateCommission.$inferSelect;
export type AffiliateApplication = typeof affiliateApplication.$inferSelect;
export type AffiliatePayoutAccount = typeof affiliatePayoutAccount.$inferSelect;
export type AffiliateSubscriptionEvent =
  typeof affiliateSubscriptionEvent.$inferSelect;
