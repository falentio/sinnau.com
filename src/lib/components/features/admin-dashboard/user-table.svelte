<script lang="ts">
  import { invalidate } from "$app/navigation";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import {
    createSvelteTable,
    FlexRender,
    renderSnippet,
  } from "$lib/components/ui/data-table/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import * as Table from "$lib/components/ui/table/index.js";
  import { client } from "$lib/orpc";
  import type { AdminUser, UserDetail } from "$lib/schemas/user";
  import { USER_ROLE_LABELS } from "$lib/schemas/user.constant";
  import { formatDateTime } from "$lib/utils/date";
  import { getErrorMessage } from "$lib/utils/error-messages";
  import { Copy01Icon } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { ORPCError } from "@orpc/client";
  import { createColumnHelper, getCoreRowModel } from "@tanstack/table-core";
  import type {
    Column,
    Row,
    SortingState,
    Updater,
  } from "@tanstack/table-core";
  import { toast } from "svelte-sonner";

  let {
    users,
    ongrantplan,
    sortKey = "createdAt",
    sortDir = "desc",
    onsortchange,
  }: {
    users: AdminUser[];
    ongrantplan?: (userId: string) => void;
    sortKey?: string;
    sortDir?: "asc" | "desc";
    onsortchange?: (key: string, dir: "asc" | "desc") => void;
  } = $props();

  let detailUserId = $state<string | null>(null);
  let detailData = $state<UserDetail | null>(null);
  let detailLoading = $state(false);

  let confirmUserId = $state<string | null>(null);
  let confirmAction = $state<"changeRole" | "ban" | "unban">("changeRole");
  let confirmNewRole = $state<"admin" | "user">("admin");
  let banReason = $state("");
  let submitting = $state(false);

  const sorting = $derived<SortingState>(
    sortKey ? [{ desc: sortDir === "desc", id: sortKey }] : []
  );
  const handleSortingChange = (updater: Updater<SortingState>) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    const [first] = next;
    if (first) {
      onsortchange?.(first.id, first.desc ? "desc" : "asc");
    } else {
      onsortchange?.("createdAt", "desc");
    }
  };

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

  const sortArrow = (column: Column<AdminUser>, label: string): string => {
    const sorted = column.getIsSorted();
    if (sorted === "asc") {
      return `${label} \u25B2`;
    }
    if (sorted === "desc") {
      return `${label} \u25BC`;
    }
    return label;
  };

  const columnHelper = createColumnHelper<AdminUser>();

  const columns = [
    columnHelper.accessor("name", {
      enableSorting: true,
      header: ({ column }) => sortArrow(column, "Name"),
    }),
    columnHelper.accessor("email", {
      enableSorting: true,
      header: ({ column }) => sortArrow(column, "Email"),
    }),
    columnHelper.accessor("role", {
      cell: ({ getValue }) => roleLabel(getValue()),
      enableSorting: true,
      header: ({ column }) => sortArrow(column, "Role"),
    }),
    columnHelper.accessor("banned", {
      cell: ({ getValue }) => (getValue() ? "Banned" : "Active"),
      enableSorting: true,
      header: ({ column }) => sortArrow(column, "Status"),
    }),
    columnHelper.accessor("createdAt", {
      cell: ({ getValue }) => formatDateTime(getValue()),
      enableSorting: true,
      header: ({ column }) => sortArrow(column, "Created"),
    }),
    columnHelper.display({
      cell: (ctx) => renderSnippet(actionsCell, { row: ctx.row }),
      id: "actions",
    }),
  ];

  const table = $derived(
    createSvelteTable({
      columns,
      data: users,
      enableSorting: true,
      getCoreRowModel: getCoreRowModel(),
      manualSorting: true,
      onSortingChange: handleSortingChange,
      state: { sorting },
    })
  );

  const openDetail = async (userId: string) => {
    detailUserId = userId;
    detailLoading = true;
    detailData = null;
    try {
      const result = await client.user.admin.getUserDetail({ userId });
      detailData = result as unknown as UserDetail;
    } catch (error) {
      if (error instanceof ORPCError) {
        toast.error(getErrorMessage(error));
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
        toast.error(getErrorMessage(error));
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("ID copied");
    } catch {
      toast.error("Failed to copy");
    }
  };
</script>

{#snippet actionsCell({ row }: { row: Row<AdminUser> })}
  <DropdownMenu.DropdownMenu>
    <DropdownMenu.Trigger>
      <Button variant="outline" size="sm">Actions</Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <DropdownMenu.Item onclick={() => openDetail(row.original.id)}>
        Detail
      </DropdownMenu.Item>
      <DropdownMenu.Item onclick={() => ongrantplan?.(row.original.id)}>
        Grant Plan
      </DropdownMenu.Item>
      <DropdownMenu.Separator />
      <DropdownMenu.Item
        onclick={() =>
          openConfirm(
            row.original.id,
            "changeRole",
            row.original.role ?? undefined
          )}
      >
        Change Role
      </DropdownMenu.Item>
      {#if row.original.banned}
        <DropdownMenu.Item
          onclick={() => openConfirm(row.original.id, "unban")}
        >
          Unban
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Item onclick={() => openConfirm(row.original.id, "ban")}>
          Ban
        </DropdownMenu.Item>
      {/if}
    </DropdownMenu.Content>
  </DropdownMenu.DropdownMenu>
{/snippet}

{#snippet roleCell({ row }: { row: Row<AdminUser> })}
  <Badge variant={roleVariant(row.original.role)}>
    {roleLabel(row.original.role)}
  </Badge>
{/snippet}

{#snippet statusCell({ row }: { row: Row<AdminUser> })}
  <Badge variant={banVariant(row.original.banned)}>
    {row.original.banned ? "Banned" : "Active"}
  </Badge>
{/snippet}

<Table.Root>
  <Table.Header>
    {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
      <Table.Row>
        {#each headerGroup.headers as header (header.id)}
          {#if header.column.getCanSort()}
            {@const handler = header.column.getToggleSortingHandler()}
            <Table.Head
              class="cursor-pointer select-none"
              onclick={() => handler?.(undefined)}
            >
              <FlexRender
                content={header.column.columnDef.header}
                context={header.getContext()}
              />
            </Table.Head>
          {:else}
            <Table.Head>
              <FlexRender
                content={header.column.columnDef.header}
                context={header.getContext()}
              />
            </Table.Head>
          {/if}
        {/each}
      </Table.Row>
    {/each}
  </Table.Header>
  <Table.Body>
    {#each table.getRowModel().rows as row (row.id)}
      <Table.Row>
        {#each row.getVisibleCells() as cell (cell.id)}
          {#if cell.column.id === "role"}
            <Table.Cell>
              <Badge variant={roleVariant(cell.getValue() as string | null)}>
                {roleLabel(cell.getValue() as string | null)}
              </Badge>
            </Table.Cell>
          {:else if cell.column.id === "banned"}
            <Table.Cell>
              <Badge variant={banVariant(cell.getValue() as boolean | null)}>
                {cell.getValue() ? "Banned" : "Active"}
              </Badge>
            </Table.Cell>
          {:else if cell.column.id === "email"}
            <Table.Cell
              class="max-w-48 truncate font-mono text-xs text-muted-foreground"
            >
              <FlexRender
                content={cell.column.columnDef.cell}
                context={cell.getContext()}
              />
            </Table.Cell>
          {:else if cell.column.id === "name"}
            <Table.Cell class="max-w-40 truncate font-medium">
              <FlexRender
                content={cell.column.columnDef.cell}
                context={cell.getContext()}
              />
            </Table.Cell>
          {:else if cell.column.id === "createdAt"}
            <Table.Cell class="text-nowrap text-xs text-muted-foreground">
              <FlexRender
                content={cell.column.columnDef.cell}
                context={cell.getContext()}
              />
            </Table.Cell>
          {:else if cell.column.id === "actions"}
            <Table.Cell>
              {#if cell.column.columnDef.cell}
                <FlexRender
                  content={cell.column.columnDef.cell}
                  context={cell.getContext()}
                />
              {/if}
            </Table.Cell>
          {:else}
            <Table.Cell>
              <FlexRender
                content={cell.column.columnDef.cell}
                context={cell.getContext()}
              />
            </Table.Cell>
          {/if}
        {/each}
      </Table.Row>
    {/each}
  </Table.Body>
</Table.Root>

<!-- Detail Dialog -->
<Dialog.Root
  open={detailUserId !== null}
  onOpenChange={() => (detailUserId = null)}
>
  <Dialog.Content class="max-w-xl">
    <Dialog.Header>
      <Dialog.Title>User Details</Dialog.Title>
    </Dialog.Header>
    {#if detailLoading}
      <div class="flex justify-center py-8">
        <span class="text-muted-foreground">Loading...</span>
      </div>
    {:else if detailData}
      {@const data = detailData}
      <div class="space-y-4 text-sm">
        <div class="flex items-center gap-2">
          <span class="font-medium">ID</span>
          <button
            onclick={() => copyToClipboard(data.id)}
            class="inline-flex items-center gap-1 truncate font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            {data.id}
            <HugeiconsIcon icon={Copy01Icon} class="size-3 shrink-0" />
          </button>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <h4
              class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Account
            </h4>
            <div class="space-y-2">
              <div>
                <span class="text-xs text-muted-foreground">Name</span>
                <p class="font-medium">{data.name}</p>
              </div>
              <div>
                <span class="text-xs text-muted-foreground">Email</span>
                <p class="truncate font-mono text-xs">{data.email}</p>
              </div>
              <div>
                <span class="text-xs text-muted-foreground">Verified</span>
                <p>{data.emailVerified ? "Yes" : "No"}</p>
              </div>
              <div>
                <span class="text-xs text-muted-foreground">Created</span>
                <p>{formatDateTime(data.createdAt)}</p>
              </div>
            </div>
          </div>
          <div class="space-y-2">
            <h4
              class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Status
            </h4>
            <div class="space-y-2">
              <div>
                <span class="text-xs text-muted-foreground">Role</span>
                <div class="mt-0.5">
                  <Badge variant={roleVariant(data.role)}>
                    {roleLabel(data.role)}
                  </Badge>
                </div>
              </div>
              <div>
                <span class="text-xs text-muted-foreground">Banned</span>
                <div class="mt-0.5">
                  <Badge variant={banVariant(data.banned)}>
                    {data.banned ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
              {#if data.banned}
                <div>
                  <span class="text-xs text-muted-foreground">Ban Reason</span>
                  <p>{data.banReason ?? "\u2014"}</p>
                </div>
              {/if}
              <div>
                <span class="text-xs text-muted-foreground">Login Method</span>
                <p>{data.lastLoginMethod ?? "\u2014"}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="border-t pt-3">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-xs text-muted-foreground">Affiliated By</span>
              <p class="truncate font-mono text-xs">
                {data.affiliatedBy ?? "\u2014"}
              </p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Session Count</span>
              <p class="font-medium">{data.sessionCount}</p>
            </div>
          </div>
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
