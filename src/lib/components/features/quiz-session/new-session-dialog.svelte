<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Form from "$lib/components/ui/form/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { untrack } from "svelte";

  import { newSessionForm } from "./new-session-form.ts";

  interface Props {
    chapterQuizCounts: Record<string, number>;
    chapters: { id: string; title: string }[];
    open: boolean;
    totalScopeCount: number;
  }

  let {
    open = $bindable(false),
    chapters,
    chapterQuizCounts,
    totalScopeCount,
  }: Props = $props();

  const { form } = newSessionForm();
  const { form: formData, enhance, submitting } = form;

  const allOption = $derived({
    label: `Semua (${totalScopeCount})`,
    value: "",
  });

  const chapterItems = $derived([
    allOption,
    ...untrack(() => chapters).map((c) => ({
      label: `${c.title} (${chapterQuizCounts[c.id] ?? 0})`,
      value: c.id,
    })),
  ]);

  const currentLabel = $derived(
    chapterItems.find((i) => i.value === ($formData.chapterId ?? ""))?.label ??
      "Pilih chapter"
  );

  const handleOpenChange = (value: boolean) => {
    open = value;
  };
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content showCloseButton={!$submitting}>
    <Dialog.Header>
      <Dialog.Title>Mulai Sesi Baru</Dialog.Title>
      <Dialog.Description>
        Pilih chapter atau mulai dari semua kuis.
      </Dialog.Description>
    </Dialog.Header>
    <form method="POST" class="flex flex-col gap-5" novalidate use:enhance>
      <Form.Field {form} name="chapterId">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Chapter</Form.Label>
            <Select.Root
              type="single"
              name="chapterId"
              items={chapterItems}
              value={$formData.chapterId ?? ""}
              onValueChange={(value: string) => {
                $formData.chapterId = value;
              }}
              disabled={$submitting}
            >
              <Select.Trigger
                {...props}
                class="w-full"
                aria-label="Pilih chapter"
              >
                <span class="min-w-0 flex-1 truncate text-left">
                  {currentLabel}
                </span>
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.Label>Semua</Select.Label>
                  <Select.Item value="undefined" label={allOption.label}>
                    {allOption.label}
                  </Select.Item>
                </Select.Group>
                <Select.Separator />
                <Select.Group>
                  <Select.Label>Chapter</Select.Label>
                  {#each chapters.sort( (a, b) => a.title.localeCompare( b.title, "id-ID", { numeric: true } ) ) as chapter (chapter.id)}
                    {@const count = chapterQuizCounts[chapter.id] ?? 0}
                    {#if count > 0}
                      <Select.Item
                        value={chapter.id}
                        label={`${chapter.title} (${count})`}
                      >
                        {chapter.title} ({count})
                      </Select.Item>
                    {/if}
                  {/each}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          {/snippet}
        </Form.Control>
        <Form.Description>
          Pilih chapter tertentu atau biarkan 'Semua' untuk menggabungkan kuis
          dari semua chapter.
        </Form.Description>
        <Form.FieldErrors />
      </Form.Field>
    </form>
    <Dialog.Footer>
      <Dialog.Close>
        {#snippet child({ props: closeProps })}
          <Button {...closeProps} variant="outline" disabled={$submitting}>
            Batal
          </Button>
        {/snippet}
      </Dialog.Close>
      <Button onclick={() => form.submit()} disabled={$submitting}>
        {$submitting ? "Membuat..." : "Mulai"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
