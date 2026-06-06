import { router } from "$lib/server/api";
import { RPCHandler } from "@orpc/server/fetch";

import type { RequestHandler } from "./$types";

const handler = new RPCHandler(router);

const handle: RequestHandler = async ({ request, locals }) => {
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
