import * as v from "valibot";

export const createPrefixedIdSchema = (prefix: string) =>
  v.pipe(
    v.string(),
    v.regex(
      new RegExp(`^${prefix}_[a-z0-9]{2}[a-zA-Z0-9]{16}$`, "u"),
      `Format ID ${prefix} tidak valid`
    )
  );
