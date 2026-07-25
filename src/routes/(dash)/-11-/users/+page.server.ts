import { createServerClient } from "$lib/orpc.server";
import { LIST_USERS_SORT_KEYS } from "$lib/schemas/user.constant";
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

type SortKey = (typeof LIST_USERS_SORT_KEYS)[number];

const parseSortKeyParam = (value: string | null): SortKey | undefined => {
  if (
    value !== null &&
    (LIST_USERS_SORT_KEYS as readonly string[]).includes(value)
  ) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- checked via includes above
    return value as SortKey;
  }
  return undefined;
};

const parseSortDirParam = (
  value: string | null
): "asc" | "desc" | undefined => {
  if (value === "asc" || value === "desc") {
    return value;
  }
  return undefined;
};

export const load: PageServerLoad = async ({ depends, url }) => {
  depends("user:list");

  const page = parsePage(url.searchParams.get("page"));
  const email = url.searchParams.get("email") ?? undefined;
  const role = parseRoleParam(url.searchParams.get("role"));
  const banStatus = parseBanStatusParam(url.searchParams.get("banStatus"));
  const sortKey = parseSortKeyParam(url.searchParams.get("sortKey"));
  const sortDir = parseSortDirParam(url.searchParams.get("sortDir"));

  const client = createServerClient();
  const result = await client.user.admin.listUsers({
    banStatus,
    email,
    page,
    role,
    sortDir,
    sortKey,
  });

  return {
    pagination: result.pagination,
    users: result.data,
  };
};
