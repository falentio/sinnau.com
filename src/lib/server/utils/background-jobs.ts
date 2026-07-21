import { getLogger } from "@logtape/logtape";

const logger = getLogger(["sinnau.com", "background", "util"]);

const pending = new Set<Promise<unknown>>();
let sizeWarned = false;
const SIZE_WARN_THRESHOLD = 1000;

export const waitUntil = (promise: Promise<unknown>): void => {
  const tracked = promise.catch((error: unknown) => {
    logger.error("Background job failed: {error}", { error });
  });
  pending.add(tracked);
  tracked.finally(() => {
    pending.delete(tracked);
  });
  if (!sizeWarned && pending.size > SIZE_WARN_THRESHOLD) {
    sizeWarned = true;
    logger.warn(
      "background-jobs: pending set exceeded {threshold} — ensure waitForAll() is called during shutdown",
      { threshold: SIZE_WARN_THRESHOLD }
    );
  }
};

export const waitForAll = async (): Promise<void> => {
  sizeWarned = false;
  const batch = [...pending];
  pending.clear();
  if (batch.length === 0) {
    return;
  }
  await Promise.allSettled(batch);
};
