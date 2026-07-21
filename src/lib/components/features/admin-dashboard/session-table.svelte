<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import type { FlashcardSession } from "$lib/schemas/flashcard-session";
  import { formatDateTime } from "$lib/utils/date";

  let { sessions }: { sessions: FlashcardSession[] } = $props();

  const truncate = (id: string) =>
    id.length > 16 ? `${id.slice(0, 16)}\u2026` : id;
</script>

<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Head>Session ID</Table.Head>
      <Table.Head>User ID</Table.Head>
      <Table.Head>Study Set ID</Table.Head>
      <Table.Head>Created At</Table.Head>
      <Table.Head>Updated At</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {#each sessions as session (session.id)}
      <Table.Row>
        <Table.Cell class="max-w-32 truncate font-mono text-xs">
          {truncate(session.id)}
        </Table.Cell>
        <Table.Cell class="max-w-40 truncate font-mono text-xs">
          {session.userId}
        </Table.Cell>
        <Table.Cell class="max-w-40 truncate font-mono text-xs">
          {session.studySetId}
        </Table.Cell>
        <Table.Cell class="text-nowrap">
          {formatDateTime(session.createdAt)}
        </Table.Cell>
        <Table.Cell class="text-nowrap">
          {formatDateTime(session.updatedAt)}
        </Table.Cell>
      </Table.Row>
    {/each}
  </Table.Body>
</Table.Root>
