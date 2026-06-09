import { setTimeout as nodeSetTimeout } from "node:timers/promises";

import { createDb } from "$lib/server/infras/db/client";

export const getTestingDb = () => createDb({ fileName: ":memory:" });

export const sleep = async (ms: number): Promise<void> => {
  await nodeSetTimeout(ms);
};
