import { getUserDetailInputSchema, userDetailSchema } from "$lib/schemas/user";
import { adminProcedure } from "$lib/server/api/base";

import { userService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Admin access required" },
  NOT_FOUND: { message: "User not found" },
} as const;

export const userAdminGetUserDetail = adminProcedure
  .errors(ERRORS)
  .input(getUserDetailInputSchema)
  .output(userDetailSchema)
  .handler(
    async ({ input, context }) =>
      await userService.getUserDetail(input, context.user.id)
  );
