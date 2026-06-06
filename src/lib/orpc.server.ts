import { getRequestEvent } from "$app/server";
import { router } from "$lib/server/api";
import { createRouterClient } from "@orpc/server";

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
});
