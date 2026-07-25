import { changeRoleInputSchema, adminUserSchema } from "$lib/schemas/user";
import { adminProcedure } from "$lib/server/api/base";

import { userService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Admin access required" },
  NOT_FOUND: { message: "User not found" },
} as const;

export const userAdminChangeRole = adminProcedure
  .errors(ERRORS)
  .input(changeRoleInputSchema)
  .output(adminUserSchema)
  .handler(
    async ({ input, context }) =>
      await userService.changeRole(input, context.user.id)
  );
