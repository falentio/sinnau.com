export const POLL_BASE_MS = 5000;
export const POLL_RETRY_MS = 10_000;
export const AUTO_NAVIGATE_MS = 5000;

export const computePollIntervalMs = (createdAt: Date): number => {
  const elapsedMs = Date.now() - createdAt.getTime();
  const elapsedMin = Math.floor(elapsedMs / 60_000);
  return POLL_BASE_MS * (1 + elapsedMin);
};
