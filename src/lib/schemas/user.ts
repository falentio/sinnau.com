import * as v from "valibot";

import { BAN_STATUS_FILTERS, USER_ROLES } from "./user.constant.ts";

const roleSchema = v.picklist(USER_ROLES);
const banStatusSchema = v.picklist(BAN_STATUS_FILTERS);

const pageSchema = v.optional(
  v.pipe(
    v.union([v.string(), v.number()]),
    v.transform((input) => (typeof input === "string" ? Number(input) : input)),
    v.integer(),
    v.minValue(1)
  ),
  1
);

const adminUserFields = {
  affiliatedBy: v.nullable(v.string()),
  banExpires: v.nullable(v.date()),
  banReason: v.nullable(v.string()),
  banned: v.nullable(v.boolean()),
  createdAt: v.date(),
  email: v.string(),
  emailVerified: v.boolean(),
  id: v.string(),
  image: v.nullable(v.string()),
  lastLoginMethod: v.nullable(v.string()),
  name: v.string(),
  // Output/display schemas use v.string() to match the DB type (string | null).
  // Input validation for role is handled by changeRoleInputSchema.
  role: v.nullable(v.string()),
} as const;

export const adminUserSchema = v.object(adminUserFields);
export type AdminUser = v.InferOutput<typeof adminUserSchema>;

export const userDetailSchema = v.object({
  ...adminUserFields,
  sessionCount: v.number(),
});
export type UserDetail = v.InferOutput<typeof userDetailSchema>;

export const listUsersInputSchema = v.object({
  banStatus: v.optional(banStatusSchema),
  email: v.optional(v.string()),
  page: pageSchema,
  role: v.optional(roleSchema),
});
export type ListUsersInput = v.InferOutput<typeof listUsersInputSchema>;

export const listUsersOutputSchema = v.object({
  data: v.array(adminUserSchema),
  pagination: v.object({
    limit: v.number(),
    page: v.number(),
    total: v.number(),
    totalPages: v.number(),
  }),
});
export type ListUsersOutput = v.InferOutput<typeof listUsersOutputSchema>;

export const changeRoleInputSchema = v.object({
  role: roleSchema,
  userId: v.string(),
});
export type ChangeRoleInput = v.InferOutput<typeof changeRoleInputSchema>;

export const banUserInputSchema = v.object({
  reason: v.optional(v.string()),
  userId: v.string(),
});
export type BanUserInput = v.InferOutput<typeof banUserInputSchema>;

export const unbanUserInputSchema = v.object({
  userId: v.string(),
});
export type UnbanUserInput = v.InferOutput<typeof unbanUserInputSchema>;

export const getUserDetailInputSchema = v.object({
  userId: v.string(),
});
export type GetUserDetailInput = v.InferOutput<typeof getUserDetailInputSchema>;
