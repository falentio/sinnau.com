import { UserGuard } from "./user.guard.ts";
import { UserDrizzleRepository } from "./user.repository.drizzle.ts";
import { UserService } from "./user.service.ts";

export const userRepo = new UserDrizzleRepository();
const userGuard = new UserGuard();
export const userService = new UserService(userRepo, userGuard);
