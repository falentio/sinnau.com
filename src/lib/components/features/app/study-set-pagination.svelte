<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page as pageStore } from '$app/state';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	let {
		pagination,
		currentFilter
	}: {
		pagination: { page: number; limit: number; total: number };
		currentFilter: string | null;
	} = $props();

	const currentPage = $derived(Number(pageStore.url.searchParams.get('page')) || pagination.page);

	const handlePageChange = (p: number) => {
		const params = new SvelteURLSearchParams();
		if (p > 1) {params.set('page', String(p));}
		if (currentFilter) {params.set('filter', currentFilter);}
		const query = params.toString();
		const target = query ? resolve(`/(app)/home?${query}`) : resolve('/(app)/home');
		goto(target, { noScroll: true, replaceState: true });
	};
</script>

<Pagination.Root
	count={pagination.total}
	perPage={pagination.limit}
	page={currentPage}
	onPageChange={handlePageChange}
>
	{#snippet children({ pages })}
		<Pagination.Content>
			<Pagination.Item class="hidden md:block">
				<Pagination.PrevButton />
			</Pagination.Item>
			{#each pages as page (page.key)}
				{#if page.type === 'ellipsis'}
					<Pagination.Item>
						<Pagination.Ellipsis />
					</Pagination.Item>
				{:else}
					<Pagination.Item>
						<Pagination.Link {page} isActive={page.value === currentPage}>
							{page.value}
						</Pagination.Link>
					</Pagination.Item>
				{/if}
			{/each}
			<Pagination.Item class="hidden md:block">
				<Pagination.NextButton />
			</Pagination.Item>
		</Pagination.Content>
	{/snippet}
</Pagination.Root>
