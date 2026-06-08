<script lang="ts">
  import { ArrowLeft01Icon } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";
</script>

<div class="pt-1">
  <Button variant="ghost">
    <HugeiconsIcon icon={ArrowLeft01Icon} />
    Kembali
  </Button>
</div>

<div class="p-6 text-muted-foreground">
  Sesi quiz belum tersedia. Backend belum diimplementasikan.
</div>
