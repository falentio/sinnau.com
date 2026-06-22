/**
 * Wrap a user query in FTS5 phrase syntax so special characters are
 * treated as literal text. The query is trimmed first; embedded double
 * quotes are escaped by doubling them per the FTS5 phrase syntax.
 *
 * The caller is responsible for ensuring the query has been validated
 * (non-empty, length, control characters) before this is invoked.
 */
export const sanitizeFts5Query = (raw: string): string => {
  const trimmed = raw.trim();
  const escaped = trimmed.replaceAll('"', '""');
  return `"${escaped}"`;
};
