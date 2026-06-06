<script lang="ts">
	import { cn } from '$lib/utils.js';
import type { WithoutChild } from '$lib/utils.js';
	import * as FormPrimitive from 'formsnap';

	const {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChild<FormPrimitive.LegendProps> = $props();
</script>

<FormPrimitive.Legend
	bind:ref
	class={cn('text-sm leading-none font-medium data-[fs-error]:text-destructive', className)}
	{...restProps}
/>
