import { createHash } from "node:crypto";

import * as v from "valibot";
import { describe, it, vi } from "vitest";

import { handleResponse, MidtransClient } from "./client.ts";
import { MidtransError } from "./error.ts";
import type { WebhookBody } from "./types.ts";

const rawServerKey = process.env.MIDTRANS_SERVER_KEY;
const hasServerKey = rawServerKey !== undefined && rawServerKey !== "";
const SERVER_KEY = rawServerKey ?? "";

const setupClient = ({
  isProduction = false,
  serverKey = SERVER_KEY,
}: {
  isProduction?: boolean;
  serverKey?: string;
} = {}) => new MidtransClient(serverKey, isProduction);

const mockResponse = (json: unknown, status = 200) =>
  Response.json(json, {
    status,
    statusText: status === 200 ? "OK" : "Status Text",
  });

const catchErr = async <T>(promise: Promise<T>): Promise<unknown> => {
  try {
    return await promise;
  } catch (error) {
    return error;
  }
};

const testSchema = v.object({
  data: v.string(),
});

describe.concurrent(handleResponse, () => {
  it("returns parsed body on 200", async ({ expect }) => {
    const response = mockResponse({ data: "hello" });
    const result = await handleResponse(response, testSchema);
    expect(result).toEqual({ data: "hello" });
  });

  it("returns parsed body on 201", async ({ expect }) => {
    const response = mockResponse({ data: "created" }, 201);
    const result = await handleResponse(response, testSchema);
    expect(result).toEqual({ data: "created" });
  });

  it("throws MidtransError on 401 with status_code in body", async ({
    expect,
  }) => {
    const response = mockResponse(
      { status_code: "401", status_message: "Access denied" },
      401
    );
    const err = await catchErr(handleResponse(response, testSchema));
    expect(err).toBeInstanceOf(MidtransError);
    expect(err).toMatchObject({
      statusCode: "401",
      statusMessage: "Access denied",
    });
  });

  it("throws MidtransError on 404 with status_code in body", async ({
    expect,
  }) => {
    const response = mockResponse(
      {
        id: "abc-123",
        status_code: "404",
        status_message: "Transaction doesn't exist.",
      },
      404
    );
    const err = await catchErr(handleResponse(response, testSchema));
    expect(err).toBeInstanceOf(MidtransError);
    expect(err).toMatchObject({
      statusCode: "404",
      statusMessage: "Transaction doesn't exist.",
    });
  });

  it("falls back to HTTP status when body has no status_code", async ({
    expect,
  }) => {
    const response = mockResponse({}, 500);
    const err = await catchErr(handleResponse(response, testSchema));
    expect(err).toMatchObject({
      statusCode: "500",
      statusMessage: "Status Text",
    });
  });
});

const describeMidtrans = hasServerKey ? describe.concurrent : describe.skip;

describeMidtrans(MidtransClient, () => {
  describe("verifySignatureKey", () => {
    it("returns true for matching signature", ({ expect }) => {
      const client = setupClient();
      const valid = client.verifySignatureKey(
        "order-123",
        "200",
        "10000.00",
        "5045db3ee0cd82f9ea68db469668ffdc32d5534d88d6436724998598ac0a3ca3ec8fc1386e62e5760ac2cc92ac5e61a919fe4b0604f5b3b57a5c63cfe86a6d35"
      );
      expect(valid).toBe(true);
    });

    it("returns false for mismatched signature", ({ expect }) => {
      const client = setupClient();
      const valid = client.verifySignatureKey(
        "order-123",
        "200",
        "10000.00",
        "bad-signature"
      );
      expect(valid).toBe(false);
    });
  });

  describe("verifyRequest", () => {
    const buildWebhookBody = (
      overrides?: Partial<WebhookBody>
    ): WebhookBody => {
      const orderId = "order-123";
      const statusCode = "200";
      const grossAmount = "10000.00";
      const serverKey = SERVER_KEY;
      const signatureKey = createHash("sha512")
        .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
        .digest("hex");
      return {
        acquirer: "gopay",
        currency: "IDR",
        fraud_status: "accept",
        gross_amount: grossAmount,
        merchant_id: "G660974076",
        order_id: orderId,
        payment_type: "qris",
        signature_key: signatureKey,
        status_code: statusCode,
        status_message: "Success",
        transaction_id: "trx-123",
        transaction_status: "settlement",
        transaction_time: "2024-01-01 00:00:00",
        ...overrides,
      };
    };

    it("returns parsed WebhookBody on valid request", async ({ expect }) => {
      const client = setupClient();
      const request = new Request("http://localhost", {
        body: JSON.stringify(buildWebhookBody()),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await client.verifyRequest(request);
      expect(result.order_id).toBe("order-123");
      expect(result.transaction_status).toBe("settlement");
      expect(result.payment_type).toBe("qris");
    });

    it("emits webhook:received with the body on valid request", async ({
      expect,
    }) => {
      const client = setupClient();
      const body = buildWebhookBody();
      const request = new Request("http://localhost", {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const listener = vi.fn<(...args: unknown[]) => void>();
      client.on("webhook:received", listener);
      await client.verifyRequest(request);
      expect(listener).toHaveBeenCalledExactlyOnceWith(body);
    });

    it("throws MidtransError on invalid signature", async ({ expect }) => {
      const client = setupClient();
      const request = new Request("http://localhost", {
        body: JSON.stringify(buildWebhookBody({ signature_key: "invalid" })),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      await expect(client.verifyRequest(request)).rejects.toThrow(
        MidtransError
      );
    });

    it("does not emit webhook:received on invalid signature", async ({
      expect,
    }) => {
      const client = setupClient();
      const request = new Request("http://localhost", {
        body: JSON.stringify(buildWebhookBody({ signature_key: "invalid" })),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const listener = vi.fn<(...args: unknown[]) => void>();
      client.on("webhook:received", listener);
      await catchErr(client.verifyRequest(request));
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("createQris", () => {
    it("creates a QRIS transaction and returns typed response", async ({
      expect,
    }) => {
      const client = setupClient();
      const orderId = `test-qris-${Date.now()}`;
      const result = await client.createQris({
        payment_type: "qris" as const,
        qris: { acquirer: "gopay" },
        transaction_details: {
          gross_amount: 10_000,
          order_id: orderId,
        },
      });
      expect(result.status_code).toBe("201");
      expect(result.transaction_status).toBe("pending");
      expect(result.order_id).toBe(orderId);
      expect(result.payment_type).toBe("qris");
      expect(result.actions).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
    });

    it("throws MidtransError with invalid server key", async ({ expect }) => {
      const client = new MidtransClient("bad-key", false);
      await expect(
        client.createQris({
          payment_type: "qris" as const,
          transaction_details: {
            gross_amount: 10_000,
            order_id: `test-qris-${Date.now()}`,
          },
        })
      ).rejects.toThrow(MidtransError);
    });
  });

  describe("getTransaction", () => {
    it("returns transaction details for an existing order", async ({
      expect,
    }) => {
      const client = setupClient();
      const orderId = `test-get-${Date.now()}`;

      const charged = await client.createQris({
        payment_type: "qris" as const,
        qris: { acquirer: "gopay" },
        transaction_details: {
          gross_amount: 10_000,
          order_id: orderId,
        },
      });

      const result = await client.getTransaction(orderId);
      expect(result.order_id).toBe(orderId);
      expect(result.transaction_id).toBe(charged.transaction_id);
      expect(result.transaction_status).toBe("pending");
    });

    it("throws MidtransError for non-existent order", async ({ expect }) => {
      const client = setupClient();
      await expect(
        client.getTransaction("nonexistent-order-999999")
      ).rejects.toThrow(MidtransError);
    });
  });
});

describe.concurrent(MidtransError, () => {
  it("has statusCode and statusMessage properties", ({ expect }) => {
    const error = new MidtransError("404", "Not found");
    expect(error.statusCode).toBe("404");
    expect(error.statusMessage).toBe("Not found");
    expect(error.message).toBe("Midtrans API error (404): Not found");
  });
});
