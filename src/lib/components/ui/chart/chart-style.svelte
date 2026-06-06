<script lang="ts">
	import { THEMES } from './chart-utils.js';
import type { ChartConfig } from './chart-utils.js';

	const { id, config }: { id: string; config: ChartConfig } = $props();

	const colorConfig = $derived(
		config ? Object.entries(config).filter(([, item]) => item.theme || item.color) : null
	);

	const themeContents = $derived.by(() => {
		if (!colorConfig || !colorConfig.length) {return;}

		const lines: string[] = [];
		for (const [theme, prefix] of Object.entries(THEMES)) {
			let content = `${prefix} [data-chart=${id}] {\n`;
			const color = colorConfig.map(([key, itemConfig]) => {
				const themeKey = theme as keyof typeof itemConfig.theme;
				const resolved = itemConfig.theme?.[themeKey] || itemConfig.color;
				return resolved ? `\t--color-${key}: ${resolved};` : null;
			});

			content += `${color.join('\n')  }\n}`;

			lines.push(content);
		}

		return lines.join('\n');
	});
</script>

{#if themeContents}
	{#key id}
		<svelte:element this={"style"}>
			{themeContents}
		</svelte:element>
	{/key}
{/if}
