import { adminUserSchema, unbanUserInputSchema } from "$lib/schemas/user";
import { adminProcedure } from "$lib/server/api/base";

import { userService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Admin access required" },
  NOT_FOUND: { message: "User not found" },
} as const;

export const userAdminUnbanUser = adminProcedure
  .errors(ERRORS)
  .input(unbanUserInputSchema)
  .output(adminUserSchema)
  .handler(
    async ({ input, context }) =>
      await userService.unbanUser(input, context.user.id)
  );
