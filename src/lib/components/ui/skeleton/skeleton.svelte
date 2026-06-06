<script lang="ts">
	import { cn } from '$lib/utils.js';
import type { WithElementRef, WithoutChildren } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLDivElement>>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="skeleton"
	class={cn('animate-pulse rounded-2xl bg-muted', className)}
	{...restProps}
></div>
