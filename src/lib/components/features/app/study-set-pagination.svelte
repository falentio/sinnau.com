<script lang="ts">
  import { page as pageStore } from "$app/state";
  import * as Pagination from "$lib/components/ui/pagination/index.js";
  import { navigateWithParams } from "$lib/utils/url";

  let {
    pagination,
  }: {
    pagination: { page: number; limit: number; total: number };
  } = $props();

  const currentPage = $derived(
    Number(pageStore.url.searchParams.get("page")) || pagination.page
  );

  const handlePageChange = (p: number) => {
    navigateWithParams(pageStore.url.searchParams, {
      page: p > 1 ? String(p) : null,
    });
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
        {#if page.type === "ellipsis"}
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
