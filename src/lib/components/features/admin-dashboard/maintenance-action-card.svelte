<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import type { ORPCError } from "@orpc/client";
  import { toast } from "svelte-sonner";

  let {
    actionName,
    description,
    actionFn,
  }: {
    actionName: string;
    description: string;
    actionFn: () => Promise<{ deletedCount: number }>;
  } = $props();

  let open = $state(false);
  let loading = $state(false);

  const handleExecute = async () => {
    loading = true;
    try {
      const result = await actionFn();
      toast.success(`${result.deletedCount} records deleted.`, {
        position: "top-right",
      });
      open = false;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      toast.error(message, { position: "top-right" });
    } finally {
      loading = false;
    }
  };
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>{actionName}</Card.Title>
    <Card.Description>{description}</Card.Description>
  </Card.Header>
  <Card.Content>
    <Dialog.Root bind:open>
      <Dialog.Trigger>
        {#snippet child({ props: triggerProps })}
          <Button {...triggerProps} variant="destructive" size="sm">Run</Button>
        {/snippet}
      </Dialog.Trigger>
      <Dialog.Content showCloseButton={false}>
        <Dialog.Header>
          <Dialog.Title>Confirm Action</Dialog.Title>
          <Dialog.Description>
            Are you sure you want to run "{actionName}"? This action cannot be
            undone.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close>
            {#snippet child({ props: closeProps })}
              <Button {...closeProps} variant="outline" disabled={loading}>
                Cancel
              </Button>
            {/snippet}
          </Dialog.Close>
          <Button onclick={handleExecute} disabled={loading}>
            {loading ? "Running..." : "Confirm"}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </Card.Content>
</Card.Root>
