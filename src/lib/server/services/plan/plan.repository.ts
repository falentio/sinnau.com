import { PLAN_KEYS } from "$lib/schemas/plan.constant";

import type {
  AdminGrant,
  NewAdminGrant,
  NewOrder,
  NewPayment,
  NewUserPlan,
  Order,
  OrderStatus,
  Payment,
  PaymentGateway,
  UserPlan,
} from "../../infras/db/schema/plan.ts";

export interface OrderListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OrderListResult {
  data: Order[];
  pagination: OrderListPagination;
}

export interface AdminGrantListPagination {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

export interface AdminGrantListResult {
  data: AdminGrant[];
  pagination: AdminGrantListPagination;
}

export interface ListAdminGrantsFilters {
  grantedBy?: string;
  page: number;
  planKey?: (typeof PLAN_KEYS)[number];
  userId?: string;
}

export type PaymentUpdatePatch = Partial<
  Pick<Payment, "gatewayTransactionId" | "payload" | "status" | "updatedAt">
>;

export interface PlanRepository {
  // ── user_plan ──
  upsertUserPlan(row: NewUserPlan): Promise<UserPlan>;
  findActiveUserPlan(userId: string, nowMs: number): Promise<UserPlan | null>;
  deleteUserPlan(userId: string): Promise<boolean>;

  // ── order ──
  insertOrder(row: NewOrder): Promise<Order>;
  findOrderById(id: string): Promise<Order | null>;
  findOrdersByUser(
    userId: string,
    page: number,
    excludeStatuses?: OrderStatus[]
  ): Promise<OrderListResult>;
  findPaidOrdersForUser(userId: string): Promise<Order[]>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null>;
  setOrderAppliedAt(id: string, appliedAtMs: number): Promise<Order | null>;

  // ── payment ──
  insertPayment(row: NewPayment): Promise<Payment>;
  findPaymentByOrderId(orderId: string): Promise<Payment | null>;
  findPaymentByTransactionId(
    gateway: PaymentGateway,
    transactionId: string
  ): Promise<Payment | null>;
  updatePayment(id: string, patch: PaymentUpdatePatch): Promise<Payment | null>;

  // ── admin_grant ──
  insertAdminGrant(row: NewAdminGrant): Promise<AdminGrant>;
  findActiveAdminGrantsForUser(
    userId: string,
    nowMs: number
  ): Promise<AdminGrant[]>;
  listAdminGrants(
    filters: ListAdminGrantsFilters
  ): Promise<AdminGrantListResult>;
}
