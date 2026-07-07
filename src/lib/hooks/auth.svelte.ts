import { browser } from "$app/environment";
import { apiKeyClient } from "@better-auth/api-key/client";
import { adminClient, lastLoginMethodClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [adminClient(), apiKeyClient(), lastLoginMethodClient()],
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
