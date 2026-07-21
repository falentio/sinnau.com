import "$lib/server/infras/logging";
import { hrtime } from "node:process";

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
import { TokenBucketRateLimiter } from "$lib/server/utils/rate-limiter";
import { getLogger, lazy, withContext } from "@logtape/logtape";
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
    user: {
      lastLoginMethod: event.locals.user?.lastLoginMethod,
      role: event.locals.user?.role,
    },
    userId: event.locals.user?.id,
  });

  const response = await svelteKitHandler({ auth, building, event, resolve });

  if (response.status === 429) {
    const retryAfter = response.headers.get("X-Retry-After") ?? "";
    return new Response(
      JSON.stringify({ message: "Too many requests. Please try again later." }),
      {
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter,
          "X-Retry-After": retryAfter,
        },
        status: 429,
        statusText: "Too Many Requests",
      }
    );
  }

  return response;
};

const adminRoutes: ((routeId: string) => boolean)[] = [
  (routeId) => routeId.includes("/(dash)/"),
];

const guardedRoutes: ((routeId: string) => boolean)[] = [
  (routeId) => routeId.includes("/(app)/"),
  ...adminRoutes,
];

const authGuardHandle: Handle = async ({ event, resolve }) => {
  const routeId = event.route.id ?? "";
  const requiresAuth = guardedRoutes.some((guard) => guard(routeId));
  const loginPage = routeId.includes("(auth)");
  const loggedIn = !!event.locals.session;

  wideEventStorage.assign({
    route: {
      requiresAuth,
    },
  });
  if (requiresAuth && !loggedIn) {
    redirect(302, "/login");
  }
  if (loginPage && loggedIn) {
    redirect(302, "/home");
  }

  return await resolve(event);
};

const wellKnownHeaders = [
  "user-agent",
  "accept-language",
  "accept-encoding",
  "accept",
  "cf-connecting-ip",
  "cf-ipcountry",
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

const securityHeadersHandle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  try {
    response.headers.set(
      "strict-transport-security",
      "max-age=63072000; includeSubDomains; preload"
    );
    response.headers.set("x-frame-options", "DENY");
    response.headers.set("x-content-type-options", "nosniff");
    response.headers.set("x-xss-protection", "0");
    response.headers.set("referrer-policy", "no-referrer");
    response.headers.set(
      "permissions-policy",
      "camera=(), microphone=(), geolocation=(), accelerometer=(), gyroscope=(), magnetometer=(), payment=(), usb=(), bluetooth=()"
    );
    response.headers.set("cross-origin-resource-policy", "same-origin");
    response.headers.set("cross-origin-opener-policy", "same-origin");
    // oxlint-disable-next-line no-shadow
  } catch (error) {
    logger.error("Failed to set security headers", () => ({
      error: error instanceof Error ? error.message : String(error),
    }));
  }
  return response;
};

const wideEventStorageHandle: Handle = async ({ event, resolve }) => {
  const requestId = nanoid(32);
  const requestStart = hrtime.bigint();
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
  return await withContext(
    {
      app: lazy(() => wideEventStorage.get().app),
      requestId: lazy(() => wideEventStorage.get().requestId),
      userId: lazy(() => wideEventStorage.get().userId),
    },
    async () =>
      await wideEventStorage.run(initialWideEventData, async () => {
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
          // oxlint-disable-next-line no-shadow
        } catch (error) {
          if (isRedirect(error)) {
            wideEventStorage.assign({
              response: {
                status: error.status,
              },
            });
            throw error;
          }
          if (isHttpError(error)) {
            wideEventStorage.assign({
              http: {
                status: error.status || 500,
              },
              isError: true,
            });
          } else if (error instanceof Error) {
            wideEventStorage.assign({
              error: {
                message: error.message,
                name: error.name,
                stack: error.stack,
              },
              http: {
                status: 500,
              },
              isError: true,
            });
          }
          throw error;
        } finally {
          const durationMs = Number(hrtime.bigint() - requestStart) / 1_000_000;
          logger.info("Request completed.", () => ({
            ...wideEventStorage.get(),
            durationMs,
          }));
        }
      })
  );
};

const watermarkHeaderHandle: Handle = async ({ event, resolve }) => {
  wideEventStorage.assign({
    app: {
      buildDate: env.APP_BUILD_DATE,
      sha: env.APP_SHA,
      version: env.APP_VERSION,
    },
  });
  const response = await resolve(event);
  try {
    response.headers.set("x-powered-by", "Sinnau");
    response.headers.set("x-sinnau-version", env.APP_VERSION);
    response.headers.set("x-sinnau-sha", env.APP_SHA);
    response.headers.set("x-ily", "ANA");
    // oxlint-disable-next-line no-shadow
  } catch (error) {
    logger.error("Failed to set x-powered-by header", () => ({
      error: error instanceof Error ? error.message : String(error),
      wideEventStorage: wideEventStorage.get(),
    }));
  }
  return response;
};

const ipRateLimiter = new TokenBucketRateLimiter({
  capacity: 2005,
  refillInterval: 60_000,
  refillRate: 300,
});

const userRateLimiter = new TokenBucketRateLimiter({
  capacity: 1108,
  refillInterval: 60_000,
  refillRate: 100,
});

const rateLimiterHandle: Handle = async ({ event, resolve }) => {
  const ip =
    event.request.headers.get("cf-connecting-ip") ??
    event.getClientAddress() ??
    "unknown";
  const userId = event.locals.user?.id;
  const ipResult = ipRateLimiter.consume(ip);
  wideEventStorage.assign({
    rateLimit: {
      ip: {
        address: ip,
        remaining: ipResult.remaining,
        reset: ipResult.reset,
      },
    },
  });
  if (!ipResult.allowed) {
    const retryAfter = Math.ceil(ipResult.reset / 1000);
    return Response.json(
      { message: "Too many requests from this IP address." },
      {
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(ipRateLimiter.capacity),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(
            Math.ceil((Date.now() + ipResult.reset) / 1000)
          ),
        },
        status: 429,
        statusText: "Too Many Requests",
      }
    );
  }

  if (!userId) {
    return await resolve(event);
  }

  const userResult = userRateLimiter.consume(userId);
  wideEventStorage.assign({
    rateLimit: {
      user: {
        remaining: userResult.remaining,
        reset: userResult.reset,
      },
    },
  });
  if (!userResult.allowed) {
    const retryAfter = Math.ceil(userResult.reset / 1000);
    return new Response(
      JSON.stringify({ message: "Too many requests from this user." }),
      {
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(userRateLimiter.capacity),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(
            Math.ceil((Date.now() + userResult.reset) / 1000)
          ),
        },
        status: 429,
        statusText: "Too Many Requests",
      }
    );
  }

  return await resolve(event);
};

const adminGuardHandle: Handle = async ({ event, resolve }) => {
  const routeId = event.route.id ?? "";
  const isAdminRoute = adminRoutes.some((guard) => guard(routeId));

  if (isAdminRoute && event.locals.user?.role !== "admin") {
    redirect(302, "/home");
  }

  return await resolve(event);
};

export const handle = sequence(
  securityHeadersHandle,
  wideEventStorageHandle,
  watermarkHeaderHandle,
  betterAuthHandle,
  authGuardHandle,
  adminGuardHandle,
  rateLimiterHandle
);
