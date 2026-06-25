const pending = new Set<Promise<unknown>>();
let sizeWarned = false;
const SIZE_WARN_THRESHOLD = 1_000;

export const waitUntil = (promise: Promise<unknown>): void => {
  const tracked = promise.catch((reason) => {
    console.error("Background job failed:", reason);
  });
  pending.add(tracked);
  tracked.finally(() => {
    pending.delete(tracked);
  });
  if (!sizeWarned && pending.size > SIZE_WARN_THRESHOLD) {
    sizeWarned = true;
    console.warn(
      `background-jobs: pending set exceeded ${SIZE_WARN_THRESHOLD} — ensure waitForAll() is called during shutdown`
    );
  }
};

export const waitForAll = async (): Promise<void> => {
  sizeWarned = false;
  const batch = Array.from(pending);
  pending.clear();
  if (batch.length === 0) {
    return;
  }
  await Promise.allSettled(batch);
};
