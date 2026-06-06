<script lang="ts">
	import { cn } from '$lib/utils.js';
import type { WithElementRef, WithoutChildren } from '$lib/utils.js';
	import { MoreHorizontalCircle01Icon } from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLSpanElement>>> = $props();
</script>

<span
	bind:this={ref}
	aria-hidden="true"
	data-slot="pagination-ellipsis"
	class={cn(
		"flex size-9 items-center items-center justify-center justify-center [&_svg:not([class*='size-'])]:size-4",
		className
	)}
	{...restProps}
>
	<HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} />
	<span class="sr-only">More pages</span>
</span>
