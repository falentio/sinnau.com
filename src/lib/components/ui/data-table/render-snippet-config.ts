import type { Snippet } from "svelte";

/**
 * A helper class to make it easy to identify Svelte Snippets in `columnDef.cell` and `columnDef.header` properties.
 *
 * > NOTE: This class should only be used internally by the adapter. If you're
 * reading this and you don't know what this is for, you probably don't need it.
 *
 * @example
 * ```svelte
 * {@const result = content(context as any)}
 * {#if result instanceof RenderSnippetConfig}
 *   {@const { snippet, params } = result}
 *   {@render snippet(params)}
 * {/if}
 * ```
 */
export class RenderSnippetConfig<TProps> {
  snippet: Snippet<[TProps]>;
  params: TProps;
  constructor(snippet: Snippet<[TProps]>, params: TProps) {
    this.snippet = snippet;
    this.params = params;
  }
}
