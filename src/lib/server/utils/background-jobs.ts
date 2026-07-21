import { getLogger } from "@logtape/logtape";

const logger = getLogger(["sinnau.com", "background", "util"]);

const pending = new Set<Promise<unknown>>();
let sizeWarned = false;
const SIZE_WARN_THRESHOLD = 1000;

const trackJob = async (promise: Promise<unknown>): Promise<void> => {
  pending.add(promise);
  try {
    await promise;
  } catch (error: unknown) {
    logger.error("Background job failed: {error}", { error });
  } finally {
    pending.delete(promise);
  }
};

export const waitUntil = (promise: Promise<unknown>): void => {
  // eslint-disable-next-line typescript/no-floating-promises
  void trackJob(promise);
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
