<script lang="ts">
  import { page } from "$app/state";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { AdminUser } from "$lib/schemas/user";
  import { USER_ROLE_LABELS } from "$lib/schemas/user.constant";
  import { formatDateTime } from "$lib/utils/date";
  import {
    CrownIcon,
    Dollar01Icon,
    UserGroupIcon,
    Link03Icon,
  } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import DashboardStatCard from "./dashboard-stat-card.svelte";

  let {
    stats,
    recentUsers,
  }: {
    stats: {
      totalUsers: number;
      pendingAffiliateApps: number;
      totalOrders: number;
      totalGrants: number;
    };
    recentUsers: AdminUser[];
  } = $props();

  const quickLinks = [
    { href: "/-11-/users", icon: UserGroupIcon, label: "Users" },
    { href: "/-11-/grants", icon: CrownIcon, label: "Plan Grants" },
    {
      href: "/-11-/affiliate/applications",
      icon: Link03Icon,
      label: "Affiliate",
    },
    { href: "/-11-/maintenance", icon: null, label: "Maintenance" },
  ];

  const roleLabel = (r: string | null) =>
    r ? (USER_ROLE_LABELS[r as keyof typeof USER_ROLE_LABELS] ?? r) : "\u2014";
</script>

<div class="container mx-auto p-6">
  <h1 class="mb-1 text-2xl font-bold">Admin Dashboard</h1>
  <p class="text-muted-foreground mb-8">Platform overview and quick actions.</p>

  <div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <DashboardStatCard
      icon={UserGroupIcon}
      label="Total Users"
      value={stats.totalUsers}
    />
    <DashboardStatCard
      icon={CrownIcon}
      label="Plan Grants"
      value={stats.totalGrants}
    />
    <DashboardStatCard
      icon={Link03Icon}
      label="Pending Affiliates"
      value={stats.pendingAffiliateApps}
    />
    <DashboardStatCard
      icon={Dollar01Icon}
      label="Total Orders"
      value={stats.totalOrders}
    />
  </div>

  <div class="grid gap-6 lg:grid-cols-2">
    <Card.Root>
      <Card.Header>
        <Card.Title>Recent Users</Card.Title>
        <Card.Description>Latest 5 signups</Card.Description>
      </Card.Header>
      <Card.Content>
        {#if recentUsers.length === 0}
          <p class="text-muted-foreground py-4 text-center text-sm">
            No users yet.
          </p>
        {:else}
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Name</Table.Head>
                <Table.Head>Role</Table.Head>
                <Table.Head>Joined</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each recentUsers as u}
                <Table.Row>
                  <Table.Cell class="max-w-40 truncate font-medium">
                    {u.name}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      variant={u.role === "admin" ? "default" : "secondary"}
                    >
                      {roleLabel(u.role)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell class="text-nowrap text-xs text-muted-foreground">
                    {formatDateTime(u.createdAt)}
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        {/if}
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        <Card.Title>Quick Links</Card.Title>
        <Card.Description>Navigate to admin sections</Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="grid gap-3 sm:grid-cols-2">
          {#each quickLinks as link}
            <a
              href={link.href}
              class="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              {#if link.icon}
                <div
                  class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10"
                >
                  <HugeiconsIcon icon={link.icon} class="size-4 text-primary" />
                </div>
              {/if}
              <span class="text-sm font-medium">{link.label}</span>
            </a>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  </div>
</div>
