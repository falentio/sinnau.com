import { browser } from "$app/env";
import type { Router } from "$lib/server/api";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { SimpleCsrfProtectionLinkPlugin } from "@orpc/client/plugins";
import type { RouterClient } from "@orpc/server";

const link = new RPCLink({
  headers: {
    "x-client-id": "sinnau.com/client",
  },
  plugins: [new SimpleCsrfProtectionLinkPlugin()],
  url: () => {
    if (typeof window === "undefined") {
      throw new TypeError("RPCLink is not allowed on the server side.");
    }
    return `${window.location.origin}/rpc`;
  },
});

// oxlint-disable-next-line import/no-mutable-exports
export let client: RouterClient<Router> = browser
  ? createORPCClient(link)
  : new Proxy({} as unknown as RouterClient<Router>, {
      get(target, p) {
        throw new TypeError(
          `Attempted to access the client on the server side. This is not allowed. Property: ${String(p)}`
        );
      },
    });

export const setClient = (newClient: RouterClient<Router>) => {
  client = newClient;
};
