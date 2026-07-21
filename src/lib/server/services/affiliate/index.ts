import { planService } from "../plan/index.ts";
import { userRepo } from "../user/index.ts";
import { AffiliateGuard } from "./affiliate.guard";
import { AffiliateDrizzleRepository } from "./affiliate.repository.drizzle";
import { AffiliateService } from "./affiliate.service";

const affiliateRepo = new AffiliateDrizzleRepository();
export const affiliateGuard = new AffiliateGuard(affiliateRepo, userRepo);
export const affiliateService = new AffiliateService(
  affiliateRepo,
  affiliateGuard
);

planService.on("order:paid", (payload) => {
  void affiliateService.handlePaymentSuccess({
    purchaseAmount: payload.grossAmount,
    purchaserUserId: payload.userId,
    transactionId: payload.transactionId,
  });
});
