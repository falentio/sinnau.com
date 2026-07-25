import { adminUserSchema, banUserInputSchema } from "$lib/schemas/user";
import { adminProcedure } from "$lib/server/api/base";

import { userService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Admin access required" },
  NOT_FOUND: { message: "User not found" },
} as const;

export const userAdminBanUser = adminProcedure
  .errors(ERRORS)
  .input(banUserInputSchema)
  .output(adminUserSchema)
  .handler(
    async ({ input, context }) =>
      await userService.banUser(input, context.user.id)
  );
