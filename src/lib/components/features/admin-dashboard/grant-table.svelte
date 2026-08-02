<script lang="ts">
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { AdminGrant } from "$lib/schemas/plan";
  import { PLAN_NAME } from "$lib/schemas/plan.constant";
  import { formatDate } from "$lib/utils/date";
  import { toast } from "svelte-sonner";

  let { grants }: { grants: AdminGrant[] } = $props();

  const variantForPlanKey = (key: string) => {
    switch (key) {
      case "PREMIUM": {
        return "default" as const;
      }
      case "PLUS": {
        return "secondary" as const;
      }
      default: {
        return "outline" as const;
      }
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const truncate = (id: string) =>
    id.length > 16 ? `${id.slice(0, 16)}\u2026` : id;
</script>

<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Head>User ID</Table.Head>
      <Table.Head>Plan</Table.Head>
      <Table.Head>Duration</Table.Head>
      <Table.Head>Note</Table.Head>
      <Table.Head>Granted By</Table.Head>
      <Table.Head>Granted At</Table.Head>
      <Table.Head>Expires At</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {#each grants as grant (grant.id)}
      <Table.Row>
        <Table.Cell class="max-w-32 truncate font-mono text-xs">
          <button
            onclick={() => copyToClipboard(grant.userId, "User ID")}
            class="hover:underline"
            title={grant.userId}
          >
            {truncate(grant.userId)}
          </button>
        </Table.Cell>
        <Table.Cell>
          <Badge variant={variantForPlanKey(grant.planKey)}>
            {PLAN_NAME[grant.planKey]}
          </Badge>
        </Table.Cell>
        <Table.Cell>
          {grant.durationMonths}mo
        </Table.Cell>
        <Table.Cell class="max-w-48 truncate text-muted-foreground">
          {grant.note ?? "\u2014"}
        </Table.Cell>
        <Table.Cell class="max-w-32 truncate font-mono text-xs">
          {#if grant.grantedBy}
            <button
              onclick={() => copyToClipboard(grant.grantedBy!, "Admin ID")}
              class="hover:underline"
              title={grant.grantedBy}
            >
              {truncate(grant.grantedBy)}
            </button>
          {:else}
            -
          {/if}
        </Table.Cell>
        <Table.Cell class="text-nowrap">
          {formatDate(grant.grantedAt)}
        </Table.Cell>
        <Table.Cell class="text-nowrap">
          {formatDate(grant.expiresAt)}
        </Table.Cell>
      </Table.Row>
    {/each}
  </Table.Body>
</Table.Root>
