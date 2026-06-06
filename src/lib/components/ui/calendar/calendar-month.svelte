<script lang="ts">
	import { cn } from '$lib/utils.js';
import type { WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	const {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<div {...restProps} bind:this={ref} class={cn('flex w-full flex-col gap-4', className)}>
	{@render children?.()}
</div>
