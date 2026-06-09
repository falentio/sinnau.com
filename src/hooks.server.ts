import "$lib/orpc.server";
import { building } from "$app/environment";
import { auth } from "$lib/server/infras/auth";
import { redirect } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { svelteKitHandler } from "better-auth/svelte-kit";

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
  return await svelteKitHandler({ auth, building, event, resolve });
};

const guardedRoutes: ((routeId: string) => boolean)[] = [
  (routeId) => routeId.includes("/(app)/"),
];

const authGuardHandle: Handle = async ({ event, resolve }) => {
  const routeId = event.route.id ?? "";
  const requiresAuth = guardedRoutes.some((guard) => guard(routeId));
  const loggedIn = !!event.locals.session;

  if (requiresAuth && !loggedIn) {
    redirect(302, "/login");
  }

  return await resolve(event);
};

export const handle = sequence(betterAuthHandle, authGuardHandle);
