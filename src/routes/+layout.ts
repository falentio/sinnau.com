import { initPostHog } from "$lib/posthog";

export const trailingSlash = "always";
export const prerender = false;

export const load = () => {
  initPostHog();
};
