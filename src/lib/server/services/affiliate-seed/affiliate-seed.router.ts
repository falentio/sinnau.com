import { affiliateSeedPending } from "./commands/affiliate-seed.seed-pending";

export const affiliateSeedRouter = {
  admin: {
    seedPendingPayouts: affiliateSeedPending,
  },
};

export type AffiliateSeedRouter = typeof affiliateSeedRouter;
