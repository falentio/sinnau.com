<script lang="ts">
  import DashboardPage from "$lib/components/features/admin-dashboard/dashboard-page.svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<DashboardPage stats={data.stats} recentUsers={data.recentUsers} />
