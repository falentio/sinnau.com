import { goto } from "$app/navigation";
import { SvelteURLSearchParams } from "svelte/reactivity";

export const buildHref = (
  source: URLSearchParams,
  patch: Record<string, string | null>
): string => {
  const params = new SvelteURLSearchParams(source);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `.?${qs}` : ".";
};

export const navigateWithParams = (
  source: URLSearchParams,
  patch: Record<string, string | null>
): void => {
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  void goto(buildHref(source, patch), { noScroll: true, replaceState: true });
};
