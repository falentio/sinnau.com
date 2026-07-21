import { browser } from "$app/environment";
import { env } from "$env/dynamic/public";
import posthog from "posthog-js";

export const initPostHog = () => {
  if (!browser) {
    return;
  }
  const key = env.PUBLIC_POSTHOG_KEY;
  if (key === undefined || key === "") {
    return;
  }
  posthog.init(key, {
    api_host: "/ph",
    defaults: "2026-05-30",
    ui_host: "https://eu.posthog.com",
  });
};
