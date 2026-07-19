import { router } from "$lib/server/api";
import { ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { SimpleCsrfProtectionHandlerPlugin } from "@orpc/server/plugins";

import type { RequestHandler } from "./$types";

const handle: RequestHandler = async ({ request, locals }) => {
  const handler = new RPCHandler(router, {
    plugins: [new SimpleCsrfProtectionHandlerPlugin()],
  });
  const { response } = await handler.handle(request, {
    context: {
      headers: request.headers,
      session: locals.session,
      user: locals.user,
    },
    prefix: "/rpc",
  });

  return response ?? new Response("Not Found", { status: 404 });
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
