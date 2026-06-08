<script lang="ts">
  import * as Pagination from "$lib/components/ui/pagination/index.js";

  interface Props {
    count: number;
    onPageChange: (page: number) => void;
    page: number;
    perPage?: number;
  }

  const { count, onPageChange, page, perPage = 10 }: Props = $props();
  const totalPages = $derived(Math.ceil(count / perPage));
</script>

{#if totalPages > 1}
  <div>
    <Pagination.Root {count} {page} {onPageChange} {perPage}>
      {#snippet children({ currentPage, pages })}
        <Pagination.Content>
          <Pagination.Item class="max-md:hidden">
            <Pagination.PrevButton />
          </Pagination.Item>
          {#each pages as page (page.key)}
            {#if page.type === "ellipsis"}
              <Pagination.Item>
                <Pagination.Ellipsis />
              </Pagination.Item>
            {:else}
              <Pagination.Item>
                <Pagination.Link isActive={page.value === currentPage} {page}
                  >{page.value}</Pagination.Link
                >
              </Pagination.Item>
            {/if}
          {/each}
          <Pagination.Item class="max-md:hidden">
            <Pagination.NextButton />
          </Pagination.Item>
        </Pagination.Content>
      {/snippet}
    </Pagination.Root>
  </div>
{/if}
