<script lang="ts">
  import MaintenanceActionCard from "$lib/components/features/admin-dashboard/maintenance-action-card.svelte";
  import { client } from "$lib/orpc";
</script>

<div class="container mx-auto p-6">
  <h1 class="mb-2 text-2xl font-bold">System Maintenance</h1>
  <p class="text-muted-foreground mb-6">
    Perform cleanup and maintenance tasks on the system.
  </p>

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
