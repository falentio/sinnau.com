import { createServerClient } from "$lib/orpc.server";
import { parsePage } from "$lib/utils/pagination";

import type { PageServerLoad } from "./$types";

const parseRoleParam = (value: string | null): "admin" | "user" | undefined => {
  if (value === "admin") {
    return "admin";
  }
  if (value === "user") {
    return "user";
  }
  return undefined;
};

const parseBanStatusParam = (
  value: string | null
): "active" | "banned" | undefined => {
  if (value === "active") {
    return "active";
  }
  if (value === "banned") {
    return "banned";
  }
  return undefined;
};

export const load: PageServerLoad = async ({ depends, url }) => {
  depends("user:list");

  const page = parsePage(url.searchParams.get("page"));
  const email = url.searchParams.get("email") ?? undefined;
  const role = parseRoleParam(url.searchParams.get("role"));
  const banStatus = parseBanStatusParam(url.searchParams.get("banStatus"));

  const client = createServerClient();
  const result = await client.user.admin.listUsers({
    banStatus,
    email,
    page,
    role,
  });

  return {
    pagination: result.pagination,
    users: result.data,
  };
};
