export const USER_PAGE_LIMIT = 10;

export const USER_ROLES = ["admin", "user"] as const;

export const USER_ROLE_LABELS = {
  admin: "Admin",
  user: "User",
} as const;

export const BAN_STATUS_FILTERS = ["banned", "active"] as const;

export const BAN_STATUS_LABELS = {
  active: "Active",
  banned: "Banned",
} as const;
