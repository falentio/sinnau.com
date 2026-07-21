import { ReferralGuard } from "./referral.guard.ts";
import { ReferralDrizzleRepository } from "./referral.repository.drizzle.ts";
import { ReferralService } from "./referral.service.ts";

const referralRepo = new ReferralDrizzleRepository();
export const referralGuard = new ReferralGuard(referralRepo);
export const referralService = new ReferralService(referralRepo, referralGuard);
