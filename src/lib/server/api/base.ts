import { hrtime } from "node:process";

import { wideEventStorage } from "$lib/server/infras/als";
import { getLogger } from "@logtape/logtape";
import { ORPCError } from "@orpc/server";

import { base } from "./context.ts";
import type { Context } from "./context.ts";
import { requireAuth } from "./middlewares/auth.ts";

const logger = getLogger(["sinnau.com", "orpc", "middleware"]);

export { requireAuth };

const extractError = (error: unknown) => {
  if (error instanceof ORPCError) {
    return {
      code: error.code,
      data: error.data,
      message: error.message,
    };
  }
  if (error instanceof Error) {
    return {
      code: "INTERNAL_SERVER_ERROR",
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
  return {
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal server error",
  };
};

export const publicProcedure = base
  .use(async ({ next, path }) => {
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
      logger.info("Procedure completed", () => ({
        duration: Number(end - start) / 1_000_000,
        isError,
        procedure: path.join("."),
      }));
    }
    return result as Awaited<ReturnType<typeof next<Context>>>;
  })
  .use(async ({ next, path }) => {
    try {
      return await next();
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      const wideEvent = wideEventStorage.get();
      logger.error("Unexpected error in procedure", () => ({
        app: wideEvent.app,
        error: extractError(error),
        procedure: path.join("."),
        production: wideEvent.production,
        requestId: wideEvent.requestId,
        user: wideEvent.user,
      }));
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  });

export const authorizedProcedure = publicProcedure.use(requireAuth);

export const adminProcedure = authorizedProcedure.use(({ context, next }) => {
  if (context.user.role !== "admin") {
    throw new ORPCError("FORBIDDEN", { message: "Admin access required" });
  }
  return next();
});
