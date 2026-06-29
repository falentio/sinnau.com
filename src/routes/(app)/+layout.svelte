<script lang="ts">
  import { page } from "$app/state";
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import UsernameSetupDialog from "$lib/components/features/auth/username-setup-dialog.svelte";
  import BottomNavbar from "$lib/components/features/navigation/bottom-navbar.svelte";
  import StudySetActionBar from "$lib/components/features/study-set/study-set-action-bar.svelte";
  import LoadingBar from "$lib/components/loading-bar.svelte";
  import ScrollArea from "$lib/components/ui/scroll-area/scroll-area.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte";

  let { children } = $props();
  const isMobile = new IsMobile();
  const authRouteIds = [
    "/(auth)/login",
    "/(auth)/sign-up",
    "/login",
    "/sign-up",
  ];
</script>

{#if authRouteIds.includes(page.route.id || "")}
  {@render children()}
{:else}
  <Sidebar.Provider open={!isMobile.current}>
    <AppSidebar />

    <Sidebar.Inset class="overflow-hidden">
      <ScrollArea class="flex max-h-svh flex-col md:max-h-[calc(100svh-1rem)]">
        <LoadingBar />
        <main
          class="group/app relative flex min-h-svh max-w-screen flex-1 flex-col bg-background md:min-h-[calc(100vh-1rem)]"
        >
          {@render children()}

          <div class="flex-auto"></div>
          {#if page.route.id?.includes("/study/[studySetId]/")}
            <StudySetActionBar />
          {:else}
            <BottomNavbar />
          {/if}

          <UsernameSetupDialog />
        </main>
      </ScrollArea>
    </Sidebar.Inset>
    <Toaster />
  </Sidebar.Provider>
{/if}
