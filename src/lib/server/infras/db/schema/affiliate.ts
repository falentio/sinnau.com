import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema.ts";

export const affiliateProfile = sqliteTable("affiliate_profile", {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  id: text("id").primaryKey(),
  nameSnapshot: text("name_snapshot").notNull(),
  slug: text("slug").notNull().unique(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
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

export const affiliateCommission = sqliteTable("affiliate_commission", {
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
  status: text("status", { enum: ["PENDING", "PAID"] })
    .notNull()
    .default("PENDING"),
  transactionId: text("transaction_id").notNull().unique(),
});
