import { waitUntil } from "../../utils/background-jobs.ts";
import { planService } from "../plan/index.ts";
import { affiliateService } from "./index.ts";

export const registerAffiliateEventListeners = (): void => {
  planService.events.on("order:paid", (payload) => {
    waitUntil(
      affiliateService.handlePaymentSuccess({
        purchaseAmount: payload.grossAmount,
        purchaserUserId: payload.userId,
        transactionId: payload.transactionId,
      })
    );
  });
};
