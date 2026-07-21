import type {
  CheckoutInput,
  CheckoutOutput,
  GetOrder,
  GetOrderInput,
  GrantPlanInput,
  ListGrantsInput,
  ListOrdersInput,
} from "$lib/schemas/plan";
import {
  ADMIN_GRANT_ID_PREFIX,
  ORDER_ID_PREFIX,
  PAYMENT_ID_PREFIX,
  PLAN_DAILY_DIVISOR,
  PLAN_DURATIONS,
  PLAN_ID_PREFIX,
  PLAN_KEYS,
  PLAN_MONTHLY_LIMIT,
  PLAN_MONTHLY_PRICE,
  PLAN_NAME,
  PLAN_BENEFITS,
  PLAN_DURATION_PAID_MONTHS,
  PLAN_QRIS_EXPIRY_MINUTES,
  PLAN_TIER_RANK,
  PLAN_WEEKLY_DIVISOR,
} from "$lib/schemas/plan.constant";
import { getLogger } from "@logtape/logtape";
import { ORPCError } from "@orpc/server";

import type {
  AdminGrant,
  NewAdminGrant,
  Order,
  OrderStatus,
  PaymentStatus,
} from "../../infras/db/schema/plan.ts";
import type { MidtransClient } from "../../infras/midtrans/client.ts";
import type { WebhookBody } from "../../infras/midtrans/types.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { PlanGuard } from "./plan.guard.ts";
import type {
  AdminGrantListResult,
  OrderListResult,
  PlanRepository,
} from "./plan.repository.ts";

const webhookLogger = getLogger(["sinnau.com", "plan", "webhook"]);
const orderLogger = getLogger(["sinnau.com", "plan", "order"]);

const isQrisPayload = (
  value: unknown
): value is { actions: { name: unknown; url: unknown }[] } => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { actions } = value as { actions?: unknown };
  if (!Array.isArray(actions)) {
    return false;
  }
  return true;
};

const isGenerateQrAction = (
  value: unknown
): value is {
  name: string;
  url: string;
} => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { name, url } = value as { name?: unknown; url?: unknown };
  return name === "generate-qr-code" && typeof url === "string";
};

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const TERMINAL_STATUSES = new Set(["EXPIRED", "CANCELLED"]);

interface DerivedPlan {
  planKey: (typeof PLAN_KEYS)[number];
  startedAt: number;
  expiresAt: number;
}

interface AppliedOrderEntry {
  alwaysApply: boolean;
  appliedAt: number;
  durationMonths: number;
  planKey: (typeof PLAN_KEYS)[number];
}

const discountLabel = (months: (typeof PLAN_DURATIONS)[number]): string => {
  if (months === 1) {
    return "Harga penuh";
  }
  const paid = PLAN_DURATION_PAID_MONTHS[months];
  return `Bayar ${paid} bulan`;
};

const computeGrossAmount = (
  planKey: (typeof PLAN_KEYS)[number],
  durationMonths: (typeof PLAN_DURATIONS)[number]
): number =>
  PLAN_MONTHLY_PRICE[planKey] * PLAN_DURATION_PAID_MONTHS[durationMonths];

const mapOrderStatus = (transactionStatus: string): OrderStatus | null => {
  switch (transactionStatus) {
    case "settlement":
    case "capture": {
      return "PAID";
    }
    case "expire": {
      return "EXPIRED";
    }
    case "deny":
    case "cancel":
    case "failure":
    case "refund":
    case "chargeback": {
      return "CANCELLED";
    }
    case "pending": {
      return "PENDING";
    }
    default: {
      return null;
    }
  }
};

const mapPaymentStatus = (transactionStatus: string): PaymentStatus => {
  switch (transactionStatus) {
    case "settlement":
    case "capture": {
      return "SUCCESS";
    }
    case "pending": {
      return "PENDING";
    }
    case "deny":
    case "cancel": {
      return "CANCELLED";
    }
    case "expire":
    case "failure": {
      return "FAILED";
    }
    case "refund":
    case "chargeback": {
      return "REFUNDED";
    }
    default: {
      return "PENDING";
    }
  }
};

const isValidTransition = (from: string, to: string): boolean => {
  if (TERMINAL_STATUSES.has(from)) {
    return false;
  }
  if (from === "PENDING") {
    return to === "PAID" || to === "EXPIRED" || to === "CANCELLED";
  }
  if (from === "PAID") {
    return to === "CANCELLED";
  }
  return false;
};

export const deriveUserPlan = (
  orders: AppliedOrderEntry[],
  nowMs: number
): DerivedPlan | null => {
  const sorted = [...orders].toSorted((a, b) => a.appliedAt - b.appliedAt);
  let current: DerivedPlan | null = null;
  for (const o of sorted) {
    const durationMs = o.durationMonths * MONTH_MS;
    const rank = PLAN_TIER_RANK[o.planKey];
    if (!current || current.expiresAt < o.appliedAt) {
      current = {
        expiresAt: o.appliedAt + durationMs,
        planKey: o.planKey,
        startedAt: o.appliedAt,
      };
    } else if (PLAN_TIER_RANK[current.planKey] === rank) {
      current = {
        expiresAt: current.expiresAt + durationMs,
        planKey: current.planKey,
        startedAt: current.startedAt,
      };
    } else if (rank > PLAN_TIER_RANK[current.planKey]) {
      current = {
        expiresAt: o.appliedAt + durationMs,
        planKey: o.planKey,
        startedAt: o.appliedAt,
      };
    } else if (o.alwaysApply) {
      current = {
        expiresAt: current.expiresAt + durationMs,
        planKey: current.planKey,
        startedAt: current.startedAt,
      };
    } else {
      continue;
    }
  }
  if (!current) {
    return null;
  }
  if (current.expiresAt < nowMs) {
    return null;
  }
  return current;
};

export class PlanService {
  private readonly repo: PlanRepository;
  private readonly guard: PlanGuard;
  private readonly midtrans: MidtransClient;

  constructor(
    repo: PlanRepository,
    guard: PlanGuard,
    midtrans: MidtransClient
  ) {
    this.repo = repo;
    this.guard = guard;
    this.midtrans = midtrans;
  }

  async checkout(
    input: CheckoutInput,
    userId: string | null | undefined
  ): Promise<CheckoutOutput> {
    const owner = this.guard.requireOwner(userId);

    const active = await this.repo.findActiveUserPlan(owner, Date.now());
    if (
      active &&
      PLAN_TIER_RANK[active.planKey] > PLAN_TIER_RANK[input.planKey]
    ) {
      throw new ORPCError("DOWNGRADE_NOT_ALLOWED", {
        message: "Cannot downgrade from an active higher-tier plan",
      });
    }

    const grossAmount = computeGrossAmount(input.planKey, input.durationMonths);
    const sku = `${input.planKey.toLowerCase()}-${input.durationMonths}m`;
    const now = Date.now();
    const orderId = generateId(ORDER_ID_PREFIX);
    const pendingExpiry = now + PLAN_QRIS_EXPIRY_MINUTES * 60 * 1000;

    await this.repo.insertOrder({
      appliedAt: null,
      createdAt: new Date(now),
      durationMonths: input.durationMonths,
      expiresAt: new Date(pendingExpiry),
      grossAmount,
      id: orderId,
      planKey: input.planKey,
      sku,
      status: "PENDING",
      updatedAt: new Date(now),
      userId: owner,
    });
    const paymentId = generateId(PAYMENT_ID_PREFIX);
    await this.repo.insertPayment({
      amount: grossAmount,
      createdAt: new Date(now),
      gateway: "midtrans",
      gatewayOrderId: orderId,
      gatewayTransactionId: null,
      id: paymentId,
      orderId,
      payload: null,
      status: "PENDING",
      updatedAt: new Date(now),
      userId: owner,
    });

    let qris;
    try {
      qris = await this.midtrans.createQris({
        custom_expiry: {
          expiry_duration: 15,
          unit: "minute",
        },
        payment_type: "qris",
        transaction_details: { gross_amount: grossAmount, order_id: orderId },
      });
    } catch {
      throw new ORPCError("PAYMENT_GATEWAY_ERROR", {
        message: "Failed to initiate QRIS payment",
      });
    }

    await this.repo.updatePayment(paymentId, {
      gatewayTransactionId: qris.transaction_id,
      payload: JSON.stringify(qris),
    });

    return {
      currency: "IDR",
      expiresAt: new Date(pendingExpiry).toISOString(),
      grossAmount,
      orderId,
      paymentData: { actions: qris.actions, qrString: qris.qr_string },
      paymentType: "QRIS",
    };
  }

  async listOrders(
    input: ListOrdersInput,
    userId: string | null | undefined
  ): Promise<OrderListResult> {
    const owner = this.guard.requireOwner(userId);
    return await this.repo.findOrdersByUser(
      owner,
      input.page ?? 1,
      input.excludeStatuses
    );
  }

  async getOrder(
    input: GetOrderInput,
    userId: string | null | undefined
  ): Promise<GetOrder> {
    const owner = this.guard.requireOwner(userId);
    const order = await this.guard.assertOrderVisibleByIdOrNotFound(
      input.orderId,
      owner
    );
    const payment = await this.repo.findPaymentByOrderId(order.id);
    const qrUrl = payment ? PlanService.parseQrisUrl(payment.payload) : null;
    return { ...order, qrUrl };
  }

  async grantPlan(
    input: GrantPlanInput,
    adminId: string | null | undefined
  ): Promise<AdminGrant> {
    const admin = this.guard.requireAdmin(adminId);
    const user = await this.guard.assertUserExistsOrNotFound(input.userId);
    const now = Date.now();
    const grant: NewAdminGrant = {
      durationMonths: input.durationMonths,
      expiresAt: new Date(now + input.durationMonths * MONTH_MS),
      grantedAt: new Date(now),
      grantedBy: admin,
      id: generateId(ADMIN_GRANT_ID_PREFIX),
      note: input.note ?? null,
      planKey: input.planKey,
      startedAt: new Date(now),
      userId: user.id,
    };
    const row = await this.repo.insertAdminGrant(grant);
    // Grant is committed first (no transaction). Derivation failure must NOT
    // roll back the grant — the grant row is the audit trail.
    await this.deriveAndUpsert(user.id);
    return row;
  }

  async listGrants(
    input: ListGrantsInput,
    adminId: string | null | undefined
  ): Promise<AdminGrantListResult> {
    this.guard.requireAdmin(adminId);
    return await this.repo.listAdminGrants({
      grantedBy: input.grantedBy,
      page: input.page ?? 1,
      planKey: input.planKey,
      userId: input.userId,
    });
  }

  static parseQrisUrl(payload: string | null): string | null {
    if (payload === null) {
      return null;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch (error) {
      orderLogger.warn("Failed to parse payment payload as JSON", () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
      return null;
    }
    if (!isQrisPayload(parsed)) {
      orderLogger.warn("Payment payload is missing actions array");
      return null;
    }
    const action = parsed.actions.find(
      (a): a is { name: string; url: string } =>
        isGenerateQrAction(a as unknown)
    );
    if (!action) {
      orderLogger.warn("Payment payload has no generate-qr-code action");
      return null;
    }
    return action.url;
  }

  // eslint-disable-next-line class-methods-use-this
  listPlans(): {
    benefits: string[];
    durations: {
      discountLabel: string;
      grossAmount: number;
      months: (typeof PLAN_DURATIONS)[number];
    }[];
    key: (typeof PLAN_KEYS)[number];
    monthlyPrice: number;
    name: string;
  }[] {
    return PLAN_KEYS.map((key) => ({
      benefits: PLAN_BENEFITS[key],
      durations: PLAN_DURATIONS.map((months) => ({
        discountLabel: discountLabel(months),
        grossAmount: computeGrossAmount(key, months),
        months,
      })),
      key,
      monthlyPrice: PLAN_MONTHLY_PRICE[key],
      name: PLAN_NAME[key],
    }));
  }

  async getAiLimitPlanForUser(userId: string | null | undefined): Promise<{
    daily: number;
    expiresAt: Date;
    planKey: (typeof PLAN_KEYS)[number];
    weekly: number;
  }> {
    const owner = this.guard.requireOwner(userId);
    const active = await this.repo.findActiveUserPlan(owner, Date.now());
    if (!active) {
      throw new ORPCError("NO_ACTIVE_PLAN", {
        message: "User has no active plan",
      });
    }
    const monthly = PLAN_MONTHLY_LIMIT[active.planKey];
    return {
      daily: Math.ceil(monthly / PLAN_DAILY_DIVISOR),
      expiresAt: active.expiresAt,
      planKey: active.planKey,
      weekly: Math.ceil(monthly / PLAN_WEEKLY_DIVISOR),
    };
  }

  async handleWebhook(body: WebhookBody): Promise<Order | undefined> {
    const order = await this.repo.findOrderById(body.order_id);
    if (!order) {
      webhookLogger.warn("Order not found for webhook", {
        orderId: body.order_id,
        transactionId: body.transaction_id,
        transactionStatus: body.transaction_status,
      });
      return undefined;
    }

    const prevStatus = order.status;
    const target = mapOrderStatus(body.transaction_status);
    if (target === null) {
      return order;
    }

    const existingPayment = await this.repo.findPaymentByTransactionId(
      "midtrans",
      body.transaction_id
    );
    if (existingPayment && prevStatus === target) {
      return order;
    }
    if (TERMINAL_STATUSES.has(prevStatus)) {
      return order;
    }
    if (!isValidTransition(prevStatus, target)) {
      return order;
    }

    const updated = await this.repo.updateOrderStatus(order.id, target);
    if (!updated) {
      webhookLogger.warn("Failed to update order status", {
        orderId: order.id,
        targetStatus: target,
      });
      return undefined;
    }

    if (target !== "PENDING") {
      const payment = await this.repo.findPaymentByOrderId(order.id);
      if (payment) {
        await this.repo.updatePayment(payment.id, {
          gatewayTransactionId: body.transaction_id,
          payload: JSON.stringify(body),
          status: mapPaymentStatus(body.transaction_status),
        });
      }
    }

    if (target === "PAID") {
      await this.repo.setOrderAppliedAt(order.id, Date.now());
      await this.deriveAndUpsert(order.userId);
    } else if (target === "CANCELLED" && prevStatus === "PAID") {
      await this.deriveAndUpsert(order.userId);
    }

    return updated;
  }

  private async deriveAndUpsert(userId: string): Promise<void> {
    const now = Date.now();
    const [paid, grants] = await Promise.all([
      this.repo.findPaidOrdersForUser(userId),
      this.repo.findActiveAdminGrantsForUser(userId, now),
    ]);
    const entries: AppliedOrderEntry[] = [];
    for (const o of paid) {
      if (o.appliedAt === null) {
        continue;
      }
      entries.push({
        alwaysApply: false,
        appliedAt: o.appliedAt.getTime(),
        durationMonths: o.durationMonths,
        planKey: o.planKey,
      });
    }
    for (const g of grants) {
      entries.push({
        alwaysApply: true,
        appliedAt: g.startedAt.getTime(),
        durationMonths: g.durationMonths,
        planKey: g.planKey,
      });
    }
    const derived = deriveUserPlan(entries, now);
    if (!derived) {
      await this.repo.deleteUserPlan(userId);
      return;
    }
    await this.repo.upsertUserPlan({
      createdAt: new Date(),
      expiresAt: new Date(derived.expiresAt),
      id: generateId(PLAN_ID_PREFIX),
      planKey: derived.planKey,
      startedAt: new Date(derived.startedAt),
      updatedAt: new Date(),
      userId,
    });
  }
}
