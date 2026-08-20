import { dev } from "$app/environment";

import { userRepo } from "../user/index.ts";
import { AffiliateSeedGuard } from "./affiliate-seed.guard";
import { AffiliateSeedDrizzleRepository } from "./affiliate-seed.repository.drizzle";
import { AffiliateSeedService } from "./affiliate-seed.service";

const affiliateSeedRepo = new AffiliateSeedDrizzleRepository();
export const affiliateSeedGuard = new AffiliateSeedGuard(userRepo);
export const affiliateSeedService = new AffiliateSeedService(
  affiliateSeedRepo,
  affiliateSeedGuard,
  dev
);
