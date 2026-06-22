<script lang="ts">
  import {
    AiBeautifyIcon,
    Book03Icon,
    CrownIcon,
    Home01Icon,
    Search02Icon,
  } from "$lib/components/features/icons";
  import AvatarFallback from "$lib/components/ui/avatar/avatar-fallback.svelte";
  import AvatarImage from "$lib/components/ui/avatar/avatar-image.svelte";
  import Avatar from "$lib/components/ui/avatar/avatar.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { getUser } from "$lib/hooks/auth.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  const user = getUser;
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
                <a href="/subs/usage" {...props}>
                  <HugeiconsIcon icon={CrownIcon} />
                  <span>Subskripsi</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
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
    </Sidebar.Menu>
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>
