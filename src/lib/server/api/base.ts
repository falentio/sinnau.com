import { hrtime } from "node:process";

import { ORPCError } from "@orpc/server";

import { base } from "./context.ts";
import { requireAuth } from "./middlewares/auth.ts";

export { requireAuth };

export const publicProcedure = base.use(async ({ next, path }) => {
  const start = hrtime.bigint();
  let result: Awaited<ReturnType<typeof next>>;
  let isError = false;
  try {
    result = await next();
  } catch (error) {
    isError = true;
    console.error("Error in publicProcedure:", error);
    throw error;
  } finally {
    const end = hrtime.bigint();
    console.error("procedure called", {
      duration: Number(end - start) / 1_000_000,
      isError,
      procedure: path.join("."),
    });
  }
  return result;
});

export const authorizedProcedure = publicProcedure.use(requireAuth);

export const adminProcedure = authorizedProcedure.use(({ context, next }) => {
  if (context.user.role !== "admin") {
    throw new ORPCError("FORBIDDEN", { message: "Admin access required" });
  }
  return next();
});
