<script lang="ts">
  import MaintenanceActionCard from "$lib/components/features/admin-dashboard/maintenance-action-card.svelte";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { client } from "$lib/orpc";
  import { toast } from "svelte-sonner";

  let runAllOpen = $state(false);
  let runningAll = $state(false);
  let results = $state<{ name: string; ok: boolean; count?: number }[]>([]);

  const actions: {
    name: string;
    run: () => Promise<{ deletedCount: number }>;
  }[] = [
    {
      name: "Delete Expired Flashcard Sessions",
      run: () => client.flashcardSession.admin.deleteExpired(),
    },
    {
      name: "Delete Expired Quiz Sessions",
      run: () => client.quizSession.admin.deleteExpired({}),
    },
    {
      name: "Clean Up Old AI Chunks",
      run: () => client.generate.admin.cleanupChunks({ olderThanDays: 30 }),
    },
    {
      name: "Clean Up Study Set Visits",
      run: () => client.studySet.admin.cleanupVisits(),
    },
  ];

  const handleRunAll = async () => {
    runningAll = true;
    results = [];

    for (const action of actions) {
      try {
        const result = await action.run();
        results = [
          ...results,
          { count: result.deletedCount, name: action.name, ok: true },
        ];
      } catch {
        results = [...results, { name: action.name, ok: false }];
      }
    }

    runningAll = false;

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    if (failed === 0) {
      toast.success(`All ${succeeded} maintenance tasks completed.`);
    } else {
      toast.error(`${failed} of ${actions.length} tasks failed.`, {
        position: "top-right",
      });
    }
  };
</script>

<div class="container mx-auto p-6">
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">System Maintenance</h1>
      <p class="text-muted-foreground mt-1 text-sm">
        Perform cleanup and maintenance tasks on the system.
      </p>
    </div>
    <Dialog.Root bind:open={runAllOpen}>
      <Dialog.Trigger>
        {#snippet child({ props: triggerProps })}
          <Button {...triggerProps} variant="destructive">Run All</Button>
        {/snippet}
      </Dialog.Trigger>
      <Dialog.Content showCloseButton={false}>
        <Dialog.Header>
          <Dialog.Title>Run All Maintenance Tasks</Dialog.Title>
          <Dialog.Description>
            This will execute all {actions.length} maintenance actions in sequence.
            This cannot be undone.
          </Dialog.Description>
        </Dialog.Header>

        {#if results.length > 0}
          <div class="space-y-2 px-6 pb-4">
            {#each results as r}
              <div
                class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span class="truncate">{r.name}</span>
                <Badge
                  variant={r.ok ? "secondary" : "destructive"}
                  class="shrink-0"
                >
                  {r.ok
                    ? r.count !== undefined
                      ? `${r.count} deleted`
                      : "OK"
                    : "Failed"}
                </Badge>
              </div>
            {/each}
          </div>
        {/if}

        <Dialog.Footer>
          <Dialog.Close>
            {#snippet child({ props: closeProps })}
              <Button {...closeProps} variant="outline" disabled={runningAll}>
                {results.length > 0 ? "Close" : "Cancel"}
              </Button>
            {/snippet}
          </Dialog.Close>
          {#if results.length === 0}
            <Button onclick={handleRunAll} disabled={runningAll}>
              {runningAll ? "Running..." : "Confirm Run All"}
            </Button>
          {/if}
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </div>

  <div class="grid gap-4 sm:grid-cols-2">
    <MaintenanceActionCard
      actionName="Delete Expired Flashcard Sessions"
      description="Remove flashcard sessions that have been idle past the retention period."
      actionFn={() => client.flashcardSession.admin.deleteExpired()}
    />

    <MaintenanceActionCard
      actionName="Delete Expired Quiz Sessions"
      description="Remove quiz sessions that have been abandoned past the retention period."
      actionFn={() => client.quizSession.admin.deleteExpired({})}
    />

    <MaintenanceActionCard
      actionName="Clean Up Old AI Chunks"
      description="Remove AI generation chunks older than 30 days."
      actionFn={() =>
        client.generate.admin.cleanupChunks({ olderThanDays: 30 })}
    />

    <MaintenanceActionCard
      actionName="Clean Up Study Set Visits"
      description="Remove outdated study set visit records."
      actionFn={() => client.studySet.admin.cleanupVisits()}
    />
  </div>
</div>
