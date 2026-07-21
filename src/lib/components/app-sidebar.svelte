<script lang="ts">
  import { page } from "$app/state";
  import {
    AiBeautifyIcon,
    AiChat02Icon,
    Book03Icon,
    Cards01Icon,
    CrownIcon,
    Home01Icon,
    PieChartIcon,
    Quiz01Icon,
    Search02Icon,
  } from "$lib/components/features/icons";
  import AvatarFallback from "$lib/components/ui/avatar/avatar-fallback.svelte";
  import AvatarImage from "$lib/components/ui/avatar/avatar-image.svelte";
  import Avatar from "$lib/components/ui/avatar/avatar.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { getUser } from "$lib/hooks/auth.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  const user = getUser;

  const studySetId = $derived(page.params.studySetId ?? "");
  const isStudySetRoute = $derived(
    (page.route.id?.includes("/study/[studySetId]/") ||
      page.route.id?.includes("/session/[studySetId]/")) ??
      false
  );
  const isSubsRoute = $derived(
    page.route.id?.startsWith("/(app)/subs/") ?? false
  );
  const isCheckout = $derived(
    page.route.id?.startsWith("/(app)/subs/checkout") ?? false
  );
  const isWaitingRoom = $derived(
    page.route.id?.includes("waiting-room") ?? false
  );

  const chapterQuery = $derived.by(() => {
    const chapter = page.url.searchParams.get("chapter");
    if (chapter) {
      return `?chapter=${chapter}`;
    }
    return "";
  });
</script>

<Sidebar.Root variant="inset">
  <Sidebar.Header>
    <a href="/home" class="flex items-center gap-2 px-2 py-1.5 font-medium">
      <div
        class="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
      >
        <HugeiconsIcon icon={AiBeautifyIcon} class="size-4" />
      </div>
      Sinnau
    </a>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/home" {...props}>
                  <HugeiconsIcon icon={Home01Icon} />
                  <span>Beranda</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/discover" {...props}>
                  <HugeiconsIcon icon={Search02Icon} />
                  <span>Cari</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              <HugeiconsIcon icon={Book03Icon} />
              <span>Modul</span>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/subs/plans" {...props}>
                  <HugeiconsIcon icon={CrownIcon} />
                  <span>Subskripsi</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    {#if isStudySetRoute && !isWaitingRoom}
      <Sidebar.Group>
        <Sidebar.GroupLabel>Modul Saya</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  <a
                    href="/study/{studySetId}/flashcard/{chapterQuery}"
                    {...props}
                  >
                    <HugeiconsIcon icon={Cards01Icon} />
                    <span>Flashcard</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  <a href="/study/{studySetId}/quiz/{chapterQuery}" {...props}>
                    <HugeiconsIcon icon={Quiz01Icon} />
                    <span>Quiz</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                <HugeiconsIcon icon={Book03Icon} />
                <span>Belajar</span>
              </Sidebar.MenuButton>
              <Sidebar.MenuSub>
                <Sidebar.MenuSubItem>
                  <Sidebar.MenuSubButton>
                    {#snippet child({ props })}
                      <a href="/session/{studySetId}/flashcard/" {...props}>
                        <HugeiconsIcon icon={Cards01Icon} />
                        <span>Review flashcard</span>
                      </a>
                    {/snippet}
                  </Sidebar.MenuSubButton>
                </Sidebar.MenuSubItem>
                <Sidebar.MenuSubItem>
                  <Sidebar.MenuSubButton>
                    {#snippet child({ props })}
                      <a href="/session/{studySetId}/quiz/" {...props}>
                        <HugeiconsIcon icon={Quiz01Icon} />
                        <span>Kerjakan quiz</span>
                      </a>
                    {/snippet}
                  </Sidebar.MenuSubButton>
                </Sidebar.MenuSubItem>
              </Sidebar.MenuSub>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                <HugeiconsIcon icon={AiChat02Icon} />
                <span>Tanya AI</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/if}

    {#if isSubsRoute && !isCheckout}
      <Sidebar.Group>
        <Sidebar.GroupLabel>Subskripsi</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  <a href="/subs/plans" {...props}>
                    <HugeiconsIcon icon={CrownIcon} />
                    <span>Paket</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  <a href="/subs/usage" {...props}>
                    <HugeiconsIcon icon={PieChartIcon} />
                    <span>Kuota</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/if}
  </Sidebar.Content>
  <Sidebar.Footer>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton size="lg">
          <Avatar class="size-8">
            <AvatarImage src="" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div class="grid flex-1 text-left text-sm leading-tight">
            <span class="truncate font-medium">Placeholder</span>
            <span class="truncate text-xs text-muted-foreground"
              >user@example.com</span
            >
          </div>
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
      {#if user()?.role === "admin"}
        <Sidebar.MenuItem>
          <Sidebar.MenuButton size="sm">
            {#snippet child({ props })}
              <a href="/-11-/" {...props}>
                <span>Admin Dashboard</span>
              </a>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      {/if}
    </Sidebar.Menu>
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>
