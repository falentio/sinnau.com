import { listUsersInputSchema, listUsersOutputSchema } from "$lib/schemas/user";
import { adminProcedure } from "$lib/server/api/base";

import { userService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Admin access required" },
} as const;

export const userAdminListUsers = adminProcedure
  .errors(ERRORS)
  .input(listUsersInputSchema)
  .output(listUsersOutputSchema)
  .handler(
    async ({ input, context }) =>
      await userService.listUsers(input, context.user.id)
  );
