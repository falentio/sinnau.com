<script lang="ts">
	import { dev } from '$app/environment';
	import Button from '$lib/components/ui/button/button.svelte';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';

	const { currentFilter }: { currentFilter: string | null } = $props();

	const filters = $derived([
		{ def: true, label: 'Terbaru', value: 'latest' },
		...(dev
			? ([
					{ def: false, label: 'Dev: Empty', value: 'empty' },
					{ def: false, label: 'Dev: Paginated', value: 'paginated' },
					{ def: false, label: 'Dev: 500', value: '500' }
				] as const)
			: [])
	]);
</script>

<ScrollArea orientation="horizontal">
	<div class="my-3 flex w-full flex-row gap-0">
		{#each filters as filter (filter.value)}
			{@const isActive = currentFilter === filter.value || (!currentFilter && filter.def)}
			<Button variant={isActive ? 'outline' : 'ghost'} href={`?filter=${filter.value}`}>
				{filter.label}
			</Button>
		{/each}
	</div>
</ScrollArea>
