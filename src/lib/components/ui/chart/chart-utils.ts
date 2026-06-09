import type { Tooltip } from "layerchart";
import { getContext, setContext } from "svelte";
import type { Component, Snippet } from "svelte";

export const THEMES = { dark: ".dark", light: "" } as const;

export type ChartConfig = Record<
  string,
  {
    label?: string;
    icon?: Component;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>;

export type ExtractSnippetParams<T> = T extends Snippet<[infer P]> ? P : never;

export type TooltipPayload = Tooltip.TooltipSeries;

// Helper to extract item config from a payload.
export const getPayloadConfigFromPayload = (
  config: ChartConfig,
  payload: TooltipPayload,
  key: string,
  // oxlint-disable-next-line no-explicit-any
  data?: Record<string, any> | null
) => {
  const payloadConfig = "config" in payload ? payload.config : undefined;

  let configLabelKey: string = key;

  if (payload.key === key) {
    configLabelKey = payload.key;
  } else if (payload.label === key) {
    configLabelKey = payload.label;
  } else if (
    key in payload &&
    // oxlint-disable-next-line no-unsafe-type-assertion
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    // oxlint-disable-next-line no-unsafe-type-assertion
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadConfig !== undefined &&
    key in payloadConfig &&
    // oxlint-disable-next-line no-unsafe-type-assertion
    typeof payloadConfig[key as keyof typeof payloadConfig] === "string"
  ) {
    // oxlint-disable-next-line no-unsafe-type-assertion
    configLabelKey = payloadConfig[key as keyof typeof payloadConfig] as string;
  } else if (
    data !== null &&
    data !== undefined &&
    key in data &&
    typeof data[key] === "string"
  ) {
    configLabelKey = data[key];
  }

  return configLabelKey in config ? config[configLabelKey] : config[key];
};

interface ChartContextValue {
  config: ChartConfig;
}

const chartContextKey = Symbol("chart-context");

export const setChartContext = (value: ChartContextValue) =>
  setContext(chartContextKey, value);

export const useChart = () => getContext<ChartContextValue>(chartContextKey);
