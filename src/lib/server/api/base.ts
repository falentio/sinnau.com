import { hrtime } from "node:process";

import { wideEventStorage } from "$lib/server/infras/als";
import { getLogger } from "@logtape/logtape";
import { ORPCError } from "@orpc/server";

import { base } from "./context.ts";
import type { Context } from "./context.ts";
import { requireAuth } from "./middlewares/auth.ts";

const logger = getLogger(["sinnau.com", "orpc", "middleware"]);

export { requireAuth };

export const publicProcedure = base.use(async ({ next, path }) => {
  const start = hrtime.bigint();
  let result: Awaited<ReturnType<typeof next>>;
  let isError = false;
  try {
    result = await next();
  } catch (error) {
    isError = true;
    throw error;
  } finally {
    const end = hrtime.bigint();
    wideEventStorage.push(["orpc", "procedures"], {
      duration: Number(end - start) / 1_000_000,
      error: isError,
      procedure: path.join("."),
    });
    logger.info("Procedure completed ", () => ({
      duration: Number(end - start) / 1_000_000,
      error: isError,
      procedure: path.join("."),
    }));
  }
  return result as Awaited<ReturnType<typeof next<Context>>>;
});

export const authorizedProcedure = publicProcedure.use(requireAuth);

export const adminProcedure = authorizedProcedure.use(({ context, next }) => {
  if (context.user.role !== "admin") {
    throw new ORPCError("FORBIDDEN", { message: "Admin access required" });
  }
  return next();
});
