<script lang="ts">
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { AdminGrant } from "$lib/schemas/plan";
  import { PLAN_NAME } from "$lib/schemas/plan.constant";
  import { formatDate } from "$lib/utils/date";

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
        <Table.Cell class="max-w-40 truncate font-mono text-xs">
          {grant.userId}
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
          {grant.note ?? "—"}
        </Table.Cell>
        <Table.Cell class="font-mono text-xs">
          {grant.grantedBy ?? "—"}
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
