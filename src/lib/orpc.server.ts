import { getRequestEvent } from "$app/server";
import { router } from "$lib/server/api";
import { createRouterClient, ORPCError } from "@orpc/server";
import { error } from "@sveltejs/kit";

if (typeof window !== "undefined") {
  throw new TypeError("This file should not be imported in the browser");
}

globalThis.$client = createRouterClient(router, {
  context: () => {
    const event = getRequestEvent();
    return {
      headers: event.request.headers,
      session: event.locals.session,
      user: event.locals.user,
    };
  },
  interceptors: [
    async ({ next }) => {
      try {
        return await next();
        // oxlint-disable-next-line unicorn/catch-error-name
      } catch (e) {
        if (e instanceof ORPCError) {
          error(e.status, {
            code: e.code as string,
            data: e.data as unknown,
            message: e.message,
          });
        }
        throw e;
      }
    },
  ],
});
