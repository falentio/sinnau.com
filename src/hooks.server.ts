import { building } from "$app/environment";
import { setClient } from "$lib/orpc";
import { createServerClient } from "$lib/orpc.server";
import type { WideEventStorage } from "$lib/server/infras/als";
import { wideEventStorage } from "$lib/server/infras/als";
import { auth } from "$lib/server/infras/auth";
import { nanoid } from "$lib/server/utils/nanoid";
import { redirect } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { svelteKitHandler } from "better-auth/svelte-kit";

setClient(createServerClient());

const betterAuthHandle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });
  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  }
  event.locals.mustGetUser = () => {
    if (!event.locals.user) {
      redirect(307, "/login");
    }
    return event.locals.user;
  };

  wideEventStorage.assign({
    userId: event.locals.user?.id,
  });

  return await svelteKitHandler({ auth, building, event, resolve });
};

const guardedRoutes: ((routeId: string) => boolean)[] = [
  (routeId) => routeId.includes("/(app)/"),
];

const authGuardHandle: Handle = async ({ event, resolve }) => {
  const routeId = event.route.id ?? "";
  const requiresAuth = guardedRoutes.some((guard) => guard(routeId));
  const loggedIn = !!event.locals.session;

  wideEventStorage.assign({
    loggedIn,
    requiresAuth,
  });
  if (requiresAuth && !loggedIn) {
    redirect(302, "/login");
  }

  return await resolve(event);
};

const wideEventStorageHandle: Handle = ({ event, resolve }) => {
  const requestId = nanoid(32);
  const initialWideEventData = {
    requestId,
    routeId: event.route.id,
  } satisfies WideEventStorage.WideEventData;
  return wideEventStorage.run(initialWideEventData, async () => {
    try {
      return await resolve(event);
    } finally {
      const wideEventData = wideEventStorage.get();
      console.log(
        { requestId },
        `Request ${requestId} completed.`,
        wideEventData
      );
    }
  });
};

export const handle = sequence(
  wideEventStorageHandle,
  betterAuthHandle,
  authGuardHandle
);
