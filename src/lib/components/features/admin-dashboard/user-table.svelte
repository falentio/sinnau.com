<script lang="ts">
  import { invalidate } from "$app/navigation";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import * as Table from "$lib/components/ui/table/index.js";
  import { client } from "$lib/orpc";
  import type { AdminUser, UserDetail } from "$lib/schemas/user";
  import { USER_ROLE_LABELS } from "$lib/schemas/user.constant";
  import { formatDateTime } from "$lib/utils/date";
  import { ORPCError } from "@orpc/client";
  import { toast } from "svelte-sonner";

  let {
    users,
    ongrantplan,
  }: {
    users: AdminUser[];
    ongrantplan?: (userId: string) => void;
  } = $props();

  let detailUserId = $state<string | null>(null);
  let detailData = $state<UserDetail | null>(null);
  let detailLoading = $state(false);

  let confirmUserId = $state<string | null>(null);
  let confirmAction = $state<"changeRole" | "ban" | "unban">("changeRole");
  let confirmNewRole = $state<"admin" | "user">("admin");
  let banReason = $state("");
  let submitting = $state(false);

  const roleLabel = (r: string | null) => {
    if (r === null) {
      return "\u2014";
    }
    return USER_ROLE_LABELS[r as keyof typeof USER_ROLE_LABELS] ?? r;
  };

  const roleVariant = (
    r: string | null
  ): "default" | "secondary" | "outline" =>
    r === "admin" ? "default" : "secondary";

  const banVariant = (banned: boolean | null): "destructive" | "secondary" =>
    banned ? "destructive" : "secondary";

  const openDetail = async (userId: string) => {
    detailUserId = userId;
    detailLoading = true;
    detailData = null;
    try {
      const result = await client.user.admin.getUserDetail({ userId });
      detailData = result as unknown as UserDetail;
    } catch (error) {
      if (error instanceof ORPCError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to load user details");
      }
      detailUserId = null;
    } finally {
      detailLoading = false;
    }
  };

  const openConfirm = (
    userId: string,
    action: "changeRole" | "ban" | "unban",
    currentRole?: string
  ) => {
    confirmUserId = userId;
    confirmAction = action;
    confirmNewRole = currentRole === "admin" ? "user" : "admin";
    banReason = "";
  };

  const handleConfirm = async () => {
    if (!confirmUserId) {
      return;
    }
    submitting = true;
    try {
      if (confirmAction === "changeRole") {
        await client.user.admin.changeRole({
          role: confirmNewRole,
          userId: confirmUserId,
        });
        toast.success("Role changed successfully");
      } else if (confirmAction === "ban") {
        await client.user.admin.banUser({
          reason: banReason || undefined,
          userId: confirmUserId,
        });
        toast.success("User banned");
      } else if (confirmAction === "unban") {
        await client.user.admin.unbanUser({ userId: confirmUserId });
        toast.success("User unbanned");
      }
      confirmUserId = null;
      await invalidate("user:list");
    } catch (error) {
      if (error instanceof ORPCError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to perform action. Please try again.");
      }
    } finally {
      submitting = false;
    }
  };

  const confirmTitle = $derived.by(() => {
    switch (confirmAction) {
      case "changeRole": {
        return `Change role to ${roleLabel(confirmNewRole)}?`;
      }
      case "ban": {
        return "Ban user?";
      }
      case "unban": {
        return "Unban user?";
      }
      default: {
        return "";
      }
    }
  });

  const confirmDescription = $derived.by(() => {
    switch (confirmAction) {
      case "changeRole": {
        return `The user will be granted ${roleLabel(confirmNewRole)} privileges.`;
      }
      case "ban": {
        return "This user will be unable to access the application.";
      }
      case "unban": {
        return "The user will regain access to the application.";
      }
      default: {
        return "";
      }
    }
  });
</script>

<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Head>Name</Table.Head>
      <Table.Head>Email</Table.Head>
      <Table.Head>Role</Table.Head>
      <Table.Head>Status</Table.Head>
      <Table.Head>Created</Table.Head>
      <Table.Head>Actions</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {#each users as u (u.id)}
      <Table.Row>
        <Table.Cell class="max-w-40 truncate font-medium">
          {u.name}
        </Table.Cell>
        <Table.Cell
          class="max-w-48 truncate font-mono text-xs text-muted-foreground"
        >
          {u.email}
        </Table.Cell>
        <Table.Cell>
          <Badge variant={roleVariant(u.role)}>
            {roleLabel(u.role)}
          </Badge>
        </Table.Cell>
        <Table.Cell>
          <Badge variant={banVariant(u.banned)}>
            {u.banned ? "Banned" : "Active"}
          </Badge>
        </Table.Cell>
        <Table.Cell class="text-nowrap text-xs text-muted-foreground">
          {formatDateTime(u.createdAt)}
        </Table.Cell>
        <Table.Cell>
          <DropdownMenu.DropdownMenu>
            <DropdownMenu.Trigger>
              <Button variant="outline" size="sm">Actions</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onclick={() => openDetail(u.id)}>
                Detail
              </DropdownMenu.Item>
              <DropdownMenu.Item onclick={() => ongrantplan?.(u.id)}>
                Grant Plan
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                onclick={() =>
                  openConfirm(u.id, "changeRole", u.role ?? undefined)}
              >
                Change Role
              </DropdownMenu.Item>
              {#if u.banned}
                <DropdownMenu.Item onclick={() => openConfirm(u.id, "unban")}>
                  Unban
                </DropdownMenu.Item>
              {:else}
                <DropdownMenu.Item onclick={() => openConfirm(u.id, "ban")}>
                  Ban
                </DropdownMenu.Item>
              {/if}
            </DropdownMenu.Content>
          </DropdownMenu.DropdownMenu>
        </Table.Cell>
      </Table.Row>
    {/each}
  </Table.Body>
</Table.Root>

<!-- Detail Dialog -->
<Dialog.Root
  open={detailUserId !== null}
  onOpenChange={() => (detailUserId = null)}
>
  <Dialog.Content class="max-w-lg">
    <Dialog.Header>
      <Dialog.Title>User Details</Dialog.Title>
    </Dialog.Header>
    {#if detailLoading}
      <div class="flex justify-center py-8">
        <span class="text-muted-foreground">Loading...</span>
      </div>
    {:else if detailData}
      <div class="space-y-3 text-sm">
        <div class="grid grid-cols-3 gap-2">
          <span class="font-medium">ID</span>
          <span class="col-span-2 truncate font-mono text-xs"
            >{detailData.id}</span
          >
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-medium">Name</span>
          <span class="col-span-2">{detailData.name}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-medium">Email</span>
          <span class="col-span-2 font-mono text-xs">{detailData.email}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-medium">Verified</span>
          <span class="col-span-2"
            >{detailData.emailVerified ? "Yes" : "No"}</span
          >
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-medium">Role</span>
          <span class="col-span-2">
            <Badge variant={roleVariant(detailData.role)}>
              {roleLabel(detailData.role)}
            </Badge>
          </span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-medium">Banned</span>
          <span class="col-span-2">
            <Badge variant={banVariant(detailData.banned)}>
              {detailData.banned ? "Yes" : "No"}
            </Badge>
          </span>
        </div>
        {#if detailData.banned}
          <div class="grid grid-cols-3 gap-2">
            <span class="font-medium">Ban Reason</span>
            <span class="col-span-2">{detailData.banReason ?? "\u2014"}</span>
          </div>
        {/if}
        <div class="grid grid-cols-3 gap-2">
          <span class="font-medium">Created</span>
          <span class="col-span-2">{formatDateTime(detailData.createdAt)}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-medium">Last Login</span>
          <span class="col-span-2"
            >{detailData.lastLoginMethod ?? "\u2014"}</span
          >
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-medium">Affiliated By</span>
          <span class="col-span-2 font-mono text-xs"
            >{detailData.affiliatedBy ?? "\u2014"}</span
          >
        </div>
        <div class="grid grid-cols-3 gap-2">
          <span class="font-medium">Sessions</span>
          <span class="col-span-2">{detailData.sessionCount}</span>
        </div>
      </div>
    {/if}
    <Dialog.Footer>
      <Dialog.Close>
        {#snippet child({ props: closeProps })}
          <Button {...closeProps} variant="outline">Close</Button>
        {/snippet}
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Confirm Action Dialog -->
<Dialog.Root
  open={confirmUserId !== null}
  onOpenChange={() => (confirmUserId = null)}
>
  <Dialog.Content showCloseButton={false}>
    <Dialog.Header>
      <Dialog.Title>{confirmTitle}</Dialog.Title>
      <Dialog.Description>
        {confirmDescription}
      </Dialog.Description>
    </Dialog.Header>
    {#if confirmAction === "ban"}
      <div class="px-6 pb-4">
        <Label for="ban-reason-input">Reason (optional)</Label>
        <Input
          id="ban-reason-input"
          placeholder="Enter ban reason..."
          bind:value={banReason}
          class="mt-2"
        />
      </div>
    {/if}
    <Dialog.Footer>
      <Dialog.Close>
        {#snippet child({ props: closeProps })}
          <Button {...closeProps} variant="outline" disabled={submitting}>
            Cancel
          </Button>
        {/snippet}
      </Dialog.Close>
      <Button
        variant={confirmAction === "ban" ? "destructive" : "default"}
        onclick={handleConfirm}
        disabled={submitting}
      >
        {submitting
          ? "Processing..."
          : confirmAction === "changeRole"
            ? "Confirm Change"
            : confirmAction === "ban"
              ? "Confirm Ban"
              : "Confirm Unban"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
