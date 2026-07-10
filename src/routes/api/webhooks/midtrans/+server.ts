import { MidtransError } from "$lib/server/infras/midtrans/error";
import { midtrans } from "$lib/server/infras/midtrans/index";
import { getLogger } from "@logtape/logtape";

import type { RequestHandler } from "./$types.ts";

const logger = getLogger(["sinnau.com", "webhook", "midtrans"]);

midtrans.on("webhook:received", (body) => {
  logger.debug("Webhook received", () => ({
    orderId: body.order_id,
    status: body.status_code,
    transactionId: body.transaction_id,
    transactionStatus: body.transaction_status,
  }));
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    await midtrans.verifyRequest(request);
    return new Response("OK", { status: 200 });
  } catch (error) {
    if (error instanceof MidtransError) {
      logger.debug("Webhook signature mismatch", () => ({
        statusCode: error.statusCode,
        statusMessage: error.statusMessage,
      }));
      return new Response(error.statusMessage, { status: 401 });
    }
    throw error;
  }
};
