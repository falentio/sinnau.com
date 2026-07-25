<script lang="ts">
  import { page } from "$app/state";
  import GrantPlanDialog from "$lib/components/features/admin-dashboard/grant-plan-dialog.svelte";
  import UserTable from "$lib/components/features/admin-dashboard/user-table.svelte";
  import StudySetPagination from "$lib/components/features/app/study-set-pagination.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import * as Select from "$lib/components/ui/select/index.js";
  import {
    BAN_STATUS_FILTERS,
    BAN_STATUS_LABELS,
    USER_ROLES,
    USER_ROLE_LABELS,
  } from "$lib/schemas/user.constant";
  import { navigateWithParams } from "$lib/utils/url";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let grantDialogOpen = $state(false);
  let grantDialogUserId = $state("");

  let emailInput = $state(page.url.searchParams.get("email") ?? "");

  const currentRole = $derived(page.url.searchParams.get("role") ?? "");
  const currentBanStatus = $derived(
    page.url.searchParams.get("banStatus") ?? ""
  );

  const handleRoleChange = (value: string) => {
    navigateWithParams(page.url.searchParams, {
      page: null,
      role: value || null,
    });
  };

  const handleBanStatusChange = (value: string) => {
    navigateWithParams(page.url.searchParams, {
      banStatus: value || null,
      page: null,
    });
  };

  const handleEmailSearch = () => {
    navigateWithParams(page.url.searchParams, {
      email: emailInput || null,
      page: null,
    });
  };

  const handleEmailKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEmailSearch();
    }
  };

  const handleGrantPlan = (userId: string) => {
    grantDialogUserId = userId;
    grantDialogOpen = true;
  };

  const roleLabel = (r: string) =>
    USER_ROLE_LABELS[r as keyof typeof USER_ROLE_LABELS] ?? r;

  const banStatusLabel = (s: string) =>
    BAN_STATUS_LABELS[s as keyof typeof BAN_STATUS_LABELS] ?? s;
</script>

<div class="container mx-auto p-6">
  <div class="mb-6">
    <h1 class="text-2xl font-bold">Users</h1>
  </div>

  <div class="mb-6 flex flex-wrap items-end gap-4">
    <div class="flex flex-col gap-2">
      <Label for="email-input">Email</Label>
      <div class="flex gap-2">
        <Input
          id="email-input"
          placeholder="Search by email..."
          bind:value={emailInput}
          onkeydown={handleEmailKeydown}
          class="w-60"
        />
        <Button variant="outline" onclick={handleEmailSearch}>Search</Button>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <Label for="role-select">Role</Label>
      <Select.Root
        type="single"
        value={currentRole || undefined}
        onValueChange={handleRoleChange}
      >
        <Select.Trigger class="w-32" id="role-select">
          {currentRole ? roleLabel(currentRole) : "All Roles"}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All Roles</Select.Item>
          {#each USER_ROLES as r (r)}
            <Select.Item value={r}>
              {roleLabel(r)}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
    <div class="flex flex-col gap-2">
      <Label for="ban-status-select">Status</Label>
      <Select.Root
        type="single"
        value={currentBanStatus || undefined}
        onValueChange={handleBanStatusChange}
      >
        <Select.Trigger class="w-32" id="ban-status-select">
          {currentBanStatus ? banStatusLabel(currentBanStatus) : "All Status"}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All Status</Select.Item>
          {#each BAN_STATUS_FILTERS as s (s)}
            <Select.Item value={s}>
              {banStatusLabel(s)}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <UserTable users={data.users} ongrantplan={handleGrantPlan} />

  {#if data.pagination.totalPages > 1}
    <div class="mt-6 flex justify-center">
      <StudySetPagination pagination={data.pagination} />
    </div>
  {/if}
</div>

<GrantPlanDialog
  bind:open={grantDialogOpen}
  bind:initialUserId={grantDialogUserId}
/>
