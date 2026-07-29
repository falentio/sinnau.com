<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { CrownIcon } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    open: boolean;
    reason: "NO_ACTIVE_PLAN" | "AI_LIMIT_EXCEEDED" | null;
  }

  let { open = $bindable(false), reason }: Props = $props();

  const title = $derived(
    reason === "NO_ACTIVE_PLAN"
      ? "Butuh Paket untuk Generate Modul"
      : "Batas Kuota AI Tercapai"
  );

  const description = $derived(
    reason === "NO_ACTIVE_PLAN"
      ? "Fitur AI Generate membutuhkan paket aktif. Pilih paket yang sesuai dengan kebutuhanmu."
      : "Kuota generate-mu sudah mencapai batas periode ini. Upgrade ke paket yang lebih tinggi untuk melanjutkan."
  );

  const ctaLabel = $derived(
    reason === "NO_ACTIVE_PLAN" ? "Lihat Paket" : "Upgrade Paket"
  );

  const handleCta = async () => {
    open = false;
    await goto(resolve("/(app)/subs/plans"));
  };

  const handleDismiss = async () => {
    open = false;
    await goto(resolve("/(app)/home"));
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Content showCloseButton>
    <Dialog.Header>
      <div
        class="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-700"
      >
        <HugeiconsIcon icon={CrownIcon} class="size-6" strokeWidth={1.5} />
      </div>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description>{description}</Dialog.Description>
    </Dialog.Header>
    <div class="text-center text-xs text-muted-foreground">
      Bayar sekali, aktif sampai durasi habis. Tanpa tagihan berulang.
    </div>
    <Dialog.Footer>
      <Button
        onclick={handleDismiss}
        variant="outline"
        class="w-full sm:w-auto"
      >
        Nanti Saja
      </Button>
      <Button onclick={handleCta} class="w-full sm:w-auto">
        {ctaLabel}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
