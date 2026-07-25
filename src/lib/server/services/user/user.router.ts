import { userAdminBanUser } from "./commands/user.admin.ban-user.ts";
import { userAdminChangeRole } from "./commands/user.admin.change-role.ts";
import { userAdminUnbanUser } from "./commands/user.admin.unban-user.ts";
import { userAdminGetUserDetail } from "./queries/user.admin.get-user-detail.ts";
import { userAdminListUsers } from "./queries/user.admin.list-users.ts";

export const userRouter = {
  admin: {
    banUser: userAdminBanUser,
    changeRole: userAdminChangeRole,
    getUserDetail: userAdminGetUserDetail,
    listUsers: userAdminListUsers,
    unbanUser: userAdminUnbanUser,
  },
};

export type UserRouter = typeof userRouter;
