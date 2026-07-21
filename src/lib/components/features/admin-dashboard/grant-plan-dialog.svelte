<script lang="ts">
  import { invalidate } from "$app/navigation";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import * as Select from "$lib/components/ui/select/index.js";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";
  import { client } from "$lib/orpc";
  import { PLAN_KEYS, PLAN_NAME } from "$lib/schemas/plan.constant";
  import { ORPCError } from "@orpc/client";
  import { toast } from "svelte-sonner";

  let {
    open = $bindable(false),
  }: {
    open: boolean;
  } = $props();

  let userId = $state("");
  let planKey = $state<"LITE" | "PLUS" | "PREMIUM">("LITE");
  let durationMonths = $state(1);
  const DURATION_OPTIONS = [1, 2, 3, 6, 9, 12] as const;
  let note = $state("");
  let submitting = $state(false);

  const handleSubmit = async () => {
    if (!userId.trim()) {
      toast.error("User ID is required", { position: "top-right" });
      return;
    }
    submitting = true;
    try {
      await client.plan.admin.grantPlan({
        durationMonths,
        note: note.trim() || undefined,
        planKey,
        userId: userId.trim(),
      });
      toast.success("Plan granted successfully", { position: "top-right" });
      open = false;
      await invalidate("plan:grants");
    } catch (error) {
      if (error instanceof ORPCError) {
        toast.error(error.message, { position: "top-right" });
      } else if (error instanceof Error) {
        toast.error(error.message, { position: "top-right" });
      } else {
        toast.error("Failed to grant plan. Please try again.", {
          position: "top-right",
        });
      }
    } finally {
      submitting = false;
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      userId = "";
      planKey = "LITE";
      durationMonths = 1;
      note = "";
    }
    open = newOpen;
  };
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content showCloseButton={false}>
    <Dialog.Header>
      <Dialog.Title>Grant Plan</Dialog.Title>
      <Dialog.Description>
        Grant a subscription plan to a user manually.
      </Dialog.Description>
    </Dialog.Header>
    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-2">
        <Label for="grant-user-id">User ID</Label>
        <Input
          id="grant-user-id"
          placeholder="User ID..."
          bind:value={userId}
          disabled={submitting}
        />
      </div>
      <div class="flex flex-col gap-2">
        <Label for="grant-plan-key">Plan</Label>
        <Select.Root
          type="single"
          value={planKey}
          onValueChange={(value) => {
            planKey = value as "LITE" | "PLUS" | "PREMIUM";
          }}
        >
          <Select.Trigger class="w-full" id="grant-plan-key">
            {PLAN_NAME[planKey]}
          </Select.Trigger>
          <Select.Content>
            {#each PLAN_KEYS as key}
              <Select.Item value={key}>
                {PLAN_NAME[key]}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <div class="flex flex-col gap-2">
        <Label>Duration</Label>
        <ButtonGroup.Root>
          {#each DURATION_OPTIONS as option}
            <Button
              variant={durationMonths === option ? "default" : "outline"}
              size="sm"
              onclick={() => (durationMonths = option)}
              disabled={submitting}
            >
              {option}
            </Button>
          {/each}
        </ButtonGroup.Root>
      </div>
      <div class="flex flex-col gap-2">
        <Label for="grant-note">Note (optional)</Label>
        <Textarea
          id="grant-note"
          placeholder="Reason for this grant..."
          bind:value={note}
          rows={3}
          disabled={submitting}
        />
      </div>
    </div>
    <Dialog.Footer>
      <Dialog.Close>
        {#snippet child({ props: closeProps })}
          <Button {...closeProps} variant="outline" disabled={submitting}>
            Cancel
          </Button>
        {/snippet}
      </Dialog.Close>
      <Button onclick={handleSubmit} disabled={submitting}>
        {submitting ? "Granting..." : "Grant Plan"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
