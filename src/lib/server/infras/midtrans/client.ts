import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";

import * as v from "valibot";

import { MidtransError } from "./error.ts";
import type {
  CreateQrisInput,
  QrisChargeResponse,
  TransactionStatus,
  WebhookBody,
} from "./types.ts";
import {
  createQrisInputSchema,
  qrisChargeResponseSchema,
  transactionStatusSchema,
  webhookBodySchema,
} from "./types.ts";

export interface MidtransEvents {
  "webhook:received": [body: WebhookBody];
}

export const handleResponse = async <T>(
  response: Response,
  schema: v.GenericSchema<T>
): Promise<T> => {
  const json: unknown = await response.json();
  const code =
    typeof json === "object" && json !== null && "status_code" in json
      ? String(json.status_code)
      : String(response.status);
  const message =
    typeof json === "object" && json !== null && "status_message" in json
      ? String(json.status_message)
      : response.statusText;
  if (code !== "200" && code !== "201") {
    throw new MidtransError(code, message);
  }
  return v.parse(schema, json);
};

// oxlint-disable-next-line unicorn/prefer-event-target
export class MidtransClient extends EventEmitter<MidtransEvents> {
  private readonly serverKey: string;
  private readonly baseUrl: string;

  constructor(serverKey: string, isProduction: boolean) {
    super();
    this.serverKey = serverKey;
    this.baseUrl = isProduction
      ? "https://api.midtrans.com/v2"
      : "https://api.sandbox.midtrans.com/v2";
  }

  verifySignatureKey(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signatureKey: string
  ): boolean {
    const input = `${orderId}${statusCode}${grossAmount}${this.serverKey}`;
    const computed = createHash("sha512").update(input).digest("hex");
    return computed === signatureKey;
  }

  async verifyRequest(request: Request): Promise<WebhookBody> {
    const json: unknown = await request.json();
    const body = v.parse(webhookBodySchema, json);
    const valid = this.verifySignatureKey(
      body.order_id,
      body.status_code,
      body.gross_amount,
      body.signature_key
    );
    if (!valid) {
      throw new MidtransError("403", "Signature key mismatch");
    }
    this.emit("webhook:received", body);
    return body;
  }

  async createQris(input: CreateQrisInput): Promise<QrisChargeResponse> {
    const validated = v.parse(createQrisInputSchema, input);
    const response = await fetch(`${this.baseUrl}/charge`, {
      body: JSON.stringify(validated),
      headers: this.#headers(),
      method: "POST",
    });
    return await handleResponse(response, qrisChargeResponseSchema);
  }

  async getTransaction(orderId: string): Promise<TransactionStatus> {
    const response = await fetch(`${this.baseUrl}/${orderId}/status`, {
      headers: this.#headers(),
      method: "GET",
    });
    return await handleResponse(response, transactionStatusSchema);
  }

  // ─── Private helpers ──────────────────────────────────────────────

  #headers(): Record<string, string> {
    const auth = Buffer.from(`${this.serverKey}:`).toString("base64");
    return {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    };
  }
}
