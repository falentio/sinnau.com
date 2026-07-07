import { ORPCError } from "@orpc/server";

import type { AiUsageLog } from "../../infras/db/schema/ai-limit.ts";
import type { AiLimitRepository } from "./ai-limit.repository.ts";

export class AiLimitGuard {
  private readonly repo: AiLimitRepository;

  public constructor(repo: AiLimitRepository) {
    this.repo = repo;
  }

  // eslint-disable-next-line class-methods-use-this
  public requireOwner(ownerId: string | null | undefined): string {
    if (ownerId === null || ownerId === undefined || ownerId === "") {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return ownerId;
  }

  public async assertLogOwnerOrForbidden(
    logId: string,
    ownerId: string
  ): Promise<AiUsageLog> {
    const log = await this.repo.findUsageLogById(logId, ownerId);
    if (!log) {
      throw new ORPCError("FORBIDDEN", {
        message: "Cannot modify this usage log",
      });
    }
    return log;
  }
}
