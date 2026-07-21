<script lang="ts">
  import AdminDashboardSidebar from "$lib/components/features/admin-dashboard/admin-dashboard-sidebar.svelte";
  import ScrollArea from "$lib/components/ui/scroll-area/scroll-area.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte";

  let { children } = $props();
  const isMobile = new IsMobile();
</script>

<Sidebar.Provider open={!isMobile.current}>
  <AdminDashboardSidebar />

  <Sidebar.Inset class="overflow-hidden">
    <ScrollArea class="flex max-h-svh flex-col md:max-h-[calc(100svh-1rem)]">
      <main
        class="group/app relative flex min-h-svh max-w-screen flex-1 flex-col bg-background md:min-h-[calc(100vh-1rem)]"
      >
        {@render children()}
      </main>
    </ScrollArea>
  </Sidebar.Inset>
  <Toaster />
</Sidebar.Provider>
