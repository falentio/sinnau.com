import { env } from "$env/dynamic/public";
import { initPostHog } from "$lib/posthog";
import type { HandleClientError, ClientInit } from "@sveltejs/kit";
import posthog from "posthog-js";

export const init: ClientInit = () => {
  initPostHog();
};

export const handleError: HandleClientError = ({ error, status }) => {
  if (
    status !== 404 &&
    env.PUBLIC_POSTHOG_KEY !== undefined &&
    env.PUBLIC_POSTHOG_KEY !== ""
  ) {
    posthog.captureException(error);
  }
};
