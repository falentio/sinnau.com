import { tsNanoid } from "../utils/nanoid.ts";

export class SlugConflictError extends Error {
  constructor() {
    super("Failed to generate a unique slug after maximum retries");
    this.name = "SlugConflictError";
  }
}

export const sanitize = (title: string): string => {
  const normalized = title.normalize("NFKD").replaceAll(/\p{M}+/gu, "");
  return normalized
    .toLowerCase()
    .replaceAll(/\s+/gu, "-")
    .replaceAll(/[^a-z0-9-]/gu, "")
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");
};

const SLUG_MAX_RETRIES = 5;

export const generateSlug = async (
  title: string,
  exists: (candidate: string) => Promise<boolean>
): Promise<string> => {
  const sanitized = sanitize(title);
  const base = sanitized.length >= 5 ? `${sanitized}-` : "";
  let entropyLength = 12 - base.length;
  entropyLength = Math.max(8, entropyLength);
  entropyLength = Math.min(12, entropyLength);

  for (let attempt = 0; attempt < SLUG_MAX_RETRIES; attempt += 1) {
    const candidate = `${base}${tsNanoid(entropyLength)}`;
    // oxlint-disable-next-line no-await-in-loop -- slug uniqueness retries are inherently sequential
    if (!(await exists(candidate.toLowerCase()))) {
      return candidate;
    }
  }
  throw new SlugConflictError();
};
