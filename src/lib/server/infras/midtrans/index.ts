import { env } from "$lib/server/infras/env";

import { MidtransClient } from "./client.ts";

export {
  handleResponse,
  MidtransClient,
  type MidtransEvents,
} from "./client.ts";
export { MidtransError } from "./error.ts";
export {
  type CreateQrisInput,
  type QrisAction,
  type QrisChargeResponse,
  type TransactionStatus,
  type WebhookBody,
  webhookBodySchema,
} from "./types.ts";

export const midtrans = new MidtransClient(
  env.MIDTRANS_SERVER_KEY,
  env.MIDTRANS_IS_PRODUCTION
);
