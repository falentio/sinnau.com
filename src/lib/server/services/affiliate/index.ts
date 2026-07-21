import { AffiliateGuard } from "./affiliate.guard";
import { AffiliateDrizzleRepository } from "./affiliate.repository.drizzle";
import { AffiliateService } from "./affiliate.service";

const affiliateRepo = new AffiliateDrizzleRepository();
export const affiliateGuard = new AffiliateGuard(affiliateRepo);
export const affiliateService = new AffiliateService(
  affiliateRepo,
  affiliateGuard
);
