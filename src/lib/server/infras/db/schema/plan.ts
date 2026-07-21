import {
  PLAN_KEYS,
  ORDER_STATUSES,
  PAYMENT_GATEWAYS,
  PAYMENT_STATUSES,
} from "$lib/schemas/plan.constant";
import type { PLAN_DURATIONS } from "$lib/schemas/plan.constant";
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema.ts";

export type PlanKey = (typeof PLAN_KEYS)[number];
export type PlanDuration = (typeof PLAN_DURATIONS)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[number];

export const userPlan = sqliteTable(
  "user_plan",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    id: text("id").primaryKey(),
    planKey: text("plan_key", { enum: PLAN_KEYS }).$type<PlanKey>().notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("user_plan_userId_unique").on(table.userId),
    index("user_plan_userId_expiresAt_idx").on(table.userId, table.expiresAt),
  ]
);

export const order = sqliteTable(
  "plan_order",
  {
    appliedAt: integer("applied_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    durationMonths: integer("duration_months").$type<PlanDuration>().notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    grossAmount: integer("gross_amount").notNull(),
    id: text("id").primaryKey(),
    planKey: text("plan_key", { enum: PLAN_KEYS }).$type<PlanKey>().notNull(),
    sku: text("sku").notNull(),
    status: text("status", { enum: ORDER_STATUSES })
      .$type<OrderStatus>()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("plan_order_userId_idx").on(table.userId),
    index("plan_order_status_expiresAt_idx").on(table.status, table.expiresAt),
  ]
);

export const payment = sqliteTable(
  "payment",
  {
    amount: integer("amount").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    gateway: text("gateway", { enum: PAYMENT_GATEWAYS })
      .$type<PaymentGateway>()
      .notNull(),
    gatewayOrderId: text("gateway_order_id").notNull(),
    gatewayTransactionId: text("gateway_transaction_id"),
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    payload: text("payload"),
    status: text("status", { enum: PAYMENT_STATUSES })
      .$type<PaymentStatus>()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("payment_gateway_transactionId_unique").on(
      table.gateway,
      table.gatewayTransactionId
    ),
    index("payment_orderId_idx").on(table.orderId),
    index("payment_userId_idx").on(table.userId),
  ]
);

export const adminGrant = sqliteTable(
  "admin_grant",
  {
    durationMonths: integer("duration_months").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    grantedAt: integer("granted_at", { mode: "timestamp_ms" }).notNull(),
    grantedBy: text("granted_by").references(() => user.id, {
      onDelete: "set null",
    }),
    id: text("id").primaryKey(),
    note: text("note"),
    planKey: text("plan_key", { enum: PLAN_KEYS }).$type<PlanKey>().notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("admin_grant_userId_expiresAt_idx").on(table.userId, table.expiresAt),
    index("admin_grant_grantedBy_grantedAt_idx").on(
      table.grantedBy,
      table.grantedAt
    ),
  ]
);

export type UserPlan = typeof userPlan.$inferSelect;
export type NewUserPlan = typeof userPlan.$inferInsert;
export type Order = typeof order.$inferSelect;
export type NewOrder = typeof order.$inferInsert;
export type Payment = typeof payment.$inferSelect;
export type NewPayment = typeof payment.$inferInsert;
export type AdminGrant = typeof adminGrant.$inferSelect;
export type NewAdminGrant = typeof adminGrant.$inferInsert;
