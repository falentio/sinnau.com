<script lang="ts">
  import { client } from "$lib/orpc";

  import DevCreateEntityDialog from "./dev-create-entity-dialog.svelte";

  interface Props {
    open: boolean;
    studySetId: string;
  }

  let { open = $bindable(false), studySetId }: Props = $props();

  let count = $state(10);

  const onSubmit = async (submitCount: number) => {
    if (!studySetId) {
      throw new Error("Study set tidak ditemukan");
    }
    for (let i = 1; i <= submitCount; i += 1) {
      // oxlint-disable-next-line no-await-in-loop -- dev-only seeding, not user-facing
      await client.chapter.create({
        description: `Chapter dev stub #${i}-${Math.random().toString(36).slice(2, 5)}`,
        studySetId,
        title: `Bab stub ${i}-${Math.random().toString(36).slice(2, 5)}`,
      });
    }
  };
</script>

<DevCreateEntityDialog
  bind:open
  bind:count
  title="Buat chapter (Dev)"
  description="Tentukan jumlah chapter dummy yang akan dibuat untuk stub."
  max={50}
  submitLabel="Buat"
  successMessage={(n) => `${n} chapter berhasil dibuat.`}
  fallbackError="Chapter belum bisa dibuat. Coba lagi sebentar."
  {onSubmit}
/>
