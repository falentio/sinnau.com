import { os } from "@orpc/server";

import type { Auth } from "../infras/auth/index.ts";

export type Session = Auth["$Infer"]["Session"]["session"];
export type User = Auth["$Infer"]["Session"]["user"];

export const base = os
  .$context<{
    headers: Headers;
    session: Session | null;
    user: User | null;
  }>()
  .errors({
    UNAUTHORIZED: { message: "Authentication is required" },
  });
