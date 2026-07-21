import {
  index,
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema.ts";

export const aiUsageLog = sqliteTable(
  "ai_usage_log",
  {
    amount: integer("amount").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    featureKey: text("feature_key").notNull(),
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    referenceId: text("reference_id"),
    refundedAt: integer("refunded_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("ai_usage_log_ownerId_createdAt_idx").on(
      table.ownerId,
      table.createdAt
    ),
    uniqueIndex("ai_usage_log_ownerId_featureKey_referenceId_unique").on(
      table.ownerId,
      table.featureKey,
      table.referenceId
    ),
  ]
);

export type AiUsageLog = typeof aiUsageLog.$inferSelect;
