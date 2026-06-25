import { ORPCError } from "@orpc/server";

import type { GenerateRepository } from "./generate.repository.ts";

export class GenerateGuard {
  private readonly repo: GenerateRepository;

  constructor(repo: GenerateRepository) {
    this.repo = repo;
  }

  // oxlint-disable-next-line class-methods-use-this
  requireOwner(ownerId: string | null | undefined): string {
    if (ownerId === null || ownerId === undefined) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return ownerId;
  }
}
