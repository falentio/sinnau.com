export const searchParamsToRecord = (
  params: URLSearchParams
): Record<string, string> => {
  const record: Record<string, string> = {};
  for (const [key, value] of params) {
    if (value) {
      record[key] = value;
    }
  }
  return record;
};
