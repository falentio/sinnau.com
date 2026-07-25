<script lang="ts">
  import { invalidate } from "$app/navigation";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { client } from "$lib/orpc";
  import type { AffiliateApplication } from "$lib/schemas/affiliate";
  import { AFFILIATE_APPLICATION_STATUS_LABEL } from "$lib/schemas/affiliate.constant";
  import { formatDateTime } from "$lib/utils/date";
  import { ORPCError } from "@orpc/client";
  import { toast } from "svelte-sonner";

  let { applications }: { applications: AffiliateApplication[] } = $props();

  let reviewAppId = $state<string | null>(null);
  let reviewMode = $state<"accept" | "reject">("accept");
  let submitting = $state(false);

  const variantForStatus = (
    status: string
  ): "default" | "secondary" | "destructive" => {
    if (status === "PENDING") {
      return "default";
    }
    if (status === "ACCEPTED") {
      return "secondary";
    }
    return "destructive";
  };

  const statusLabel = (status: string) =>
    AFFILIATE_APPLICATION_STATUS_LABEL[
      status as keyof typeof AFFILIATE_APPLICATION_STATUS_LABEL
    ] ?? status;

  const openReview = (id: string, mode: "accept" | "reject") => {
    reviewAppId = id;
    reviewMode = mode;
  };

  const handleReview = async () => {
    if (!reviewAppId) {
      return;
    }
    submitting = true;
    try {
      if (reviewMode === "accept") {
        await client.affiliate.admin.acceptApplication({
          applicationId: reviewAppId,
        });
        toast.success("Application accepted", { position: "top-right" });
      } else {
        await client.affiliate.admin.rejectApplication({
          applicationId: reviewAppId,
        });
        toast.success("Application rejected", { position: "top-right" });
      }
      reviewAppId = null;
      await invalidate("affiliate:applications");
    } catch (error) {
      if (error instanceof ORPCError) {
        toast.error(error.message, { position: "top-right" });
      } else if (error instanceof Error) {
        toast.error(error.message, { position: "top-right" });
      } else {
        toast.error("Failed to process application. Please try again.", {
          position: "top-right",
        });
      }
    } finally {
      submitting = false;
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const truncate = (id: string) =>
    id.length > 16 ? `${id.slice(0, 16)}\u2026` : id;
</script>

<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Head>User ID</Table.Head>
      <Table.Head>Advantage</Table.Head>
      <Table.Head>Instagram</Table.Head>
      <Table.Head>TikTok</Table.Head>
      <Table.Head>YouTube</Table.Head>
      <Table.Head>Status</Table.Head>
      <Table.Head>Applied At</Table.Head>
      <Table.Head>Actions</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {#each applications as app (app.id)}
      <Table.Row>
        <Table.Cell class="max-w-32 truncate font-mono text-xs">
          <button
            onclick={() => copyToClipboard(app.userId, "User ID")}
            class="hover:underline"
            title={app.userId}
          >
            {truncate(app.userId)}
          </button>
        </Table.Cell>
        <Table.Cell class="max-w-48 truncate text-muted-foreground">
          {app.advantage}
        </Table.Cell>
        <Table.Cell class="max-w-32 truncate font-mono text-xs">
          {#if app.instagramHandle}
            {@const igClean = app.instagramHandle.replace(/^@/, "")}
            <a
              href="https://instagram.com/{igClean}"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >
              {app.instagramHandle}
            </a>
          {:else}
            —
          {/if}
        </Table.Cell>
        <Table.Cell class="max-w-32 truncate font-mono text-xs">
          {#if app.tiktokHandle}
            {@const ttClean = app.tiktokHandle.startsWith("@")
              ? app.tiktokHandle
              : `@${app.tiktokHandle}`}
            <a
              href="https://tiktok.com/{ttClean}"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >
              {app.tiktokHandle}
            </a>
          {:else}
            —
          {/if}
        </Table.Cell>
        <Table.Cell class="max-w-32 truncate font-mono text-xs">
          {#if app.youtubeHandle}
            <a
              href={app.youtubeHandle}
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >
              {app.youtubeHandle}
            </a>
          {:else}
            —
          {/if}
        </Table.Cell>
        <Table.Cell>
          <Badge variant={variantForStatus(app.status)}>
            {statusLabel(app.status)}
          </Badge>
        </Table.Cell>
        <Table.Cell class="text-nowrap">
          {formatDateTime(app.createdAt)}
        </Table.Cell>
        <Table.Cell>
          {#if app.status === "PENDING"}
            <div class="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onclick={() => openReview(app.id, "accept")}
              >
                Accept
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onclick={() => openReview(app.id, "reject")}
              >
                Reject
              </Button>
            </div>
          {:else}
            <span class="text-xs text-muted-foreground">—</span>
          {/if}
        </Table.Cell>
      </Table.Row>
    {/each}
  </Table.Body>
</Table.Root>

<Dialog.Root
  open={reviewAppId !== null}
  onOpenChange={() => (reviewAppId = null)}
>
  <Dialog.Content showCloseButton={false}>
    <Dialog.Header>
      <Dialog.Title>
        {reviewMode === "accept" ? "Accept Application" : "Reject Application"}
      </Dialog.Title>
      <Dialog.Description>
        {reviewMode === "accept"
          ? "This will approve the application and create an affiliate profile for the user."
          : "This will reject the application. The user may re-apply later."}
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Dialog.Close>
        {#snippet child({ props: closeProps })}
          <Button {...closeProps} variant="outline" disabled={submitting}>
            Cancel
          </Button>
        {/snippet}
      </Dialog.Close>
      <Button
        variant={reviewMode === "accept" ? "default" : "destructive"}
        onclick={handleReview}
        disabled={submitting}
      >
        {submitting
          ? reviewMode === "accept"
            ? "Accepting..."
            : "Rejecting..."
          : reviewMode === "accept"
            ? "Confirm Accept"
            : "Confirm Reject"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
