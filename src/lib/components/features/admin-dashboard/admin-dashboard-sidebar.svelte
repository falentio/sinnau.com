<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
</script>

<Sidebar.Root variant="inset">
  <Sidebar.Header>
    <a href="/-11-/" class="flex items-center gap-2 px-2 py-1.5 font-medium">
      <div
        class="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
      >
        <span class="text-xs font-bold">A</span>
      </div>
      Admin
    </a>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>Dashboard</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/-11-/" {...props}>
                  <span>Overview</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
  <Sidebar.Rail />
</Sidebar.Root>
