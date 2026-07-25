<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { FlashcardSession } from "$lib/schemas/flashcard-session";
  import { formatDateTime } from "$lib/utils/date";
  import { toast } from "svelte-sonner";

  let { sessions }: { sessions: FlashcardSession[] } = $props();

  const truncate = (id: string) =>
    id.length > 16 ? `${id.slice(0, 16)}\u2026` : id;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Failed to copy");
    }
  };
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
          <button
            onclick={() => copyToClipboard(session.id, "Session ID")}
            class="hover:underline"
            title={session.id}
          >
            {truncate(session.id)}
          </button>
        </Table.Cell>
        <Table.Cell class="max-w-40 truncate font-mono text-xs">
          <button
            onclick={() => copyToClipboard(session.userId, "User ID")}
            class="hover:underline"
            title={session.userId}
          >
            {truncate(session.userId)}
          </button>
        </Table.Cell>
        <Table.Cell class="max-w-40 truncate font-mono text-xs">
          <button
            onclick={() => copyToClipboard(session.studySetId, "Study Set ID")}
            class="hover:underline"
            title={session.studySetId}
          >
            {truncate(session.studySetId)}
          </button>
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
