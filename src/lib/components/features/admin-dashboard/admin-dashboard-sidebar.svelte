<script lang="ts">
  import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import {
    Home01Icon,
    Cards01Icon,
    CrownIcon,
    UserGroupIcon,
    Link03Icon,
    Settings02Icon,
    Dollar01Icon,
    Wallet01Icon,
  } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  const isActive = (href: string) => page.url.pathname === href;
</script>

<Sidebar.Root variant="inset">
  <Sidebar.Header>
    <a href="/-11-/" class="flex items-center gap-2 px-2 py-1.5 font-medium">
      <img
        src="/favicon.jpg"
        alt=""
        aria-hidden="true"
        width="24"
        height="24"
        class="size-6 rounded-md"
      />
      Admin
    </a>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton data-active={isActive("/-11-/")}>
              {#snippet child({ props })}
                <a href="/-11-/" {...props}>
                  <HugeiconsIcon icon={Home01Icon} />
                  <span>Overview</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Group>
      <Sidebar.GroupLabel>User Management</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton data-active={isActive("/-11-/users")}>
              {#snippet child({ props })}
                <a href="/-11-/users" {...props}>
                  <HugeiconsIcon icon={UserGroupIcon} />
                  <span>Users</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton data-active={isActive("/-11-/grants")}>
              {#snippet child({ props })}
                <a href="/-11-/grants" {...props}>
                  <HugeiconsIcon icon={CrownIcon} />
                  <span>Plan Grants</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Group>
      <Sidebar.GroupLabel>Affiliate</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              data-active={isActive("/-11-/affiliate/applications")}
            >
              {#snippet child({ props })}
                <a href="/-11-/affiliate/applications" {...props}>
                  <HugeiconsIcon icon={Link03Icon} />
                  <span>Applications</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              data-active={isActive("/-11-/affiliate/payouts")}
            >
              {#snippet child({ props })}
                <a href="/-11-/affiliate/payouts" {...props}>
                  <HugeiconsIcon icon={Wallet01Icon} />
                  <span>Payouts</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              data-active={isActive("/-11-/affiliate/history")}
            >
              {#snippet child({ props })}
                <a href="/-11-/affiliate/history" {...props}>
                  <HugeiconsIcon icon={Dollar01Icon} />
                  <span>Payout History</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Group>
      <Sidebar.GroupLabel>Sessions</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              data-active={isActive("/-11-/sessions/flashcard")}
            >
              {#snippet child({ props })}
                <a href="/-11-/sessions/flashcard" {...props}>
                  <HugeiconsIcon icon={Cards01Icon} />
                  <span>Flashcard</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Group>
      <Sidebar.GroupLabel>Finance</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton data-active={isActive("/-11-/orders")}>
              {#snippet child({ props })}
                <a href="/-11-/orders" {...props}>
                  <HugeiconsIcon icon={Dollar01Icon} />
                  <span>Orders</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Group>
      <Sidebar.GroupLabel>System</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton data-active={isActive("/-11-/maintenance")}>
              {#snippet child({ props })}
                <a href="/-11-/maintenance" {...props}>
                  <HugeiconsIcon icon={Settings02Icon} />
                  <span>Maintenance</span>
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
        <Sidebar.MenuButton size="sm">
          {#snippet child({ props })}
            <a href="/home" {...props}>
              <HugeiconsIcon icon={Home01Icon} />
              <span>Back to Home</span>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>
