import "$lib/server/infras/logging";
import { dev } from "$app/env";
import { building } from "$app/environment";
import { setClient } from "$lib/orpc";
import { createServerClient } from "$lib/orpc.server";
import type { WideEventStorage } from "$lib/server/infras/als";
import { wideEventStorage } from "$lib/server/infras/als";
import { auth } from "$lib/server/infras/auth";
import { env } from "$lib/server/infras/env";
import { generateService } from "$lib/server/services/generate";
import { nanoid } from "$lib/server/utils/nanoid";
import { getLogger } from "@logtape/logtape";
import { redirect, isHttpError, isRedirect } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { svelteKitHandler } from "better-auth/svelte-kit";

const logger = getLogger(["sinnau.com", "http", "middleware"]);

setClient(createServerClient());

if (!building) {
  await generateService.startupRecovery();
}

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
    user: { id: event.locals.user?.id },
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
    route: {
      requiresAuth,
    },
  });
  if (requiresAuth && !loggedIn) {
    redirect(302, "/login");
  }

  return await resolve(event);
};

const wellKnownHeaders = [
  "user-agent",
  "accept-language",
  "accept-encoding",
  "accept",
  "content-type",
  "content-length",
  "x-client-id",
  "origin",
  "referer",
];
const getWellKnownHeaders = (request: Request) => {
  const headers: Record<string, string> = {};
  for (const header of wellKnownHeaders) {
    const value = request.headers.get(header);
    if (value) {
      headers[header] = value;
    }
  }
  return headers;
};

const wideEventStorageHandle: Handle = async ({ event, resolve }) => {
  const requestId = nanoid(32);
  const initialWideEventData = {
    production: !dev,
    request: {
      headers: getWellKnownHeaders(event.request),
      ip:
        event.request.headers.get("cf-connecting-ip") ??
        event.getClientAddress() ??
        "",
      method: event.request.method,
      pathname: event.url.pathname,
      searchParams: Object.fromEntries(event.url.searchParams.entries()),
    },
    requestId,
    route: event.route,
  } satisfies WideEventStorage.WideEventData;
  return wideEventStorage.run(initialWideEventData, async () => {
    try {
      const result = await resolve(event);
      result.headers.set("x-request-id", requestId);
      wideEventStorage.assign({
        response: {
          headers: Object.fromEntries(result.headers.entries()),
          status: result.status,
        },
      });
      return result;
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
      if (isHttpError(error)) {
        wideEventStorage.assign({
          http: {
            status: error.status || 500,
          },
        });
      }
      if (error instanceof Error) {
        wideEventStorage.assign({
          error: {
            message: error.message,
            name: error.name,
          },
          http: {
            status: 500,
          },
        });
      }
      throw error;
    } finally {
      logger.info("Request completed.", () => ({ ...wideEventStorage.get() }));
    }
  });
};

const watermarkHeaderHandle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  try {
    response.headers.set("x-powered-by", "Sinnau");
    response.headers.set("x-sinnau-version", env.APP_VERSION);
    response.headers.set("x-sinnau-sha", env.APP_SHA);
    response.headers.set("x-ily", "ANA");
    wideEventStorage.assign({
      app: {
        buildDate: env.APP_BUILD_DATE,
        sha: env.APP_SHA,
        version: env.APP_VERSION,
      },
    });
  } catch (error) {
    logger.error("Failed to set x-powered-by header", () => ({
      error: error instanceof Error ? error.message : String(error),
      wideEventStorage: wideEventStorage.get(),
    }));
  }
  return response;
};

export const handle = sequence(
  wideEventStorageHandle,
  watermarkHeaderHandle,
  betterAuthHandle,
  authGuardHandle
);
