import { getRequestEvent } from "$app/server";
import { router } from "$lib/server/api";
import { createRouterClient, ORPCError } from "@orpc/server";
import { error } from "@sveltejs/kit";

const instanceOfORPCError = (err: unknown): err is ORPCError<string, unknown> =>
  err instanceof ORPCError;

if (typeof window !== "undefined") {
  throw new TypeError("This file should not be imported in the browser");
}

export const createServerClient = () =>
  createRouterClient(router, {
    context: () => {
      const event = getRequestEvent();

      return {
        headers: event.request.headers,
        session: event.locals.session,
        user: event.locals.user,
      };
    },
    interceptors: [
      async (context) => {
        try {
          return await context.next();
          // oxlint-disable-next-line unicorn/catch-error-name
        } catch (e) {
          if (instanceOfORPCError(e)) {
            error(e.status, {
              code: e.code,
              data: e.data,
              message: e.message,
            });
          }
          throw e;
        }
      },
    ],
  });
