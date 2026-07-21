import { browser } from "$app/environment";
import { apiKeyClient } from "@better-auth/api-key/client";
import { dashClient } from "@better-auth/infra/client";
import { adminClient, lastLoginMethodClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";
import { toast } from "svelte-sonner";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  fetchOptions: {
    onError: async (ctx) => {
      const { response } = ctx;
      if (response?.status === 429) {
        const retry = response.headers.get("X-Retry-After");
        toast.error(
          retry !== null && retry !== ""
            ? `Terlalu banyak permintaan. Coba lagi dalam ${retry} detik.`
            : "Terlalu banyak permintaan. Mohon tunggu sebentar."
        );
      }
    },
  },
  plugins: [
    adminClient(),
    apiKeyClient(),
    lastLoginMethodClient(),
    dashClient(),
  ],
});

type _Session = (typeof authClient.$Infer)["Session"];
export type Session = _Session["session"];
export type User = _Session["user"];

let session = $state(null as Session | null);
let user = $state(null as User | null);
let isPending = $state(true);

let initialUser = $state(null as User | null);

if (browser) {
  authClient.useSession().subscribe((s) => {
    ({ isPending } = s);
    if (!isPending) {
      session = s.data?.session ?? null;
      user = s.data?.user ?? null;
    }
  });
}

export const setInitialUser = (u: () => User | null) => {
  initialUser = u();
};

export const getUser = () => {
  if (isPending) {
    return user ?? initialUser;
  }
  return user;
};

export const getSession = () => session;

export const getIsPending = () => isPending;
