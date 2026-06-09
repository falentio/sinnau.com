<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Form from "$lib/components/ui/form/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";
  import { client } from "$lib/orpc";
  import type { CreateChapterInput } from "$lib/schemas/chapter";
  import { createChapterInputSchema } from "$lib/schemas/chapter";
  import {
    CHAPTER_DESCRIPTION_MAX_LENGTH,
    CHAPTER_TITLE_MAX_LENGTH,
  } from "$lib/schemas/chapter.constant";
  import { navigateWithParams } from "$lib/utils/url";
  import { ORPCError } from "@orpc/client";
  import { toast } from "svelte-sonner";
  import { defaults, superForm } from "sveltekit-superforms";
  import { valibotClient } from "sveltekit-superforms/adapters";
  import * as v from "valibot";

  const formSchema = v.omit(createChapterInputSchema, ["studySetId"]);

  const studySetId = $derived(page.params.studySetId ?? "");

  let dialogOpen = $derived(
    page.url.searchParams.get("action") === "create-chapter"
  );

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigateWithParams(page.url.searchParams, { action: null });
    }
  };

  const submitChapter = async (data: v.InferOutput<typeof formSchema>) => {
    const input: CreateChapterInput = {
      ...data,
      studySetId,
    };
    await client.chapter.create(input);
  };

  const form = superForm(
    defaults<v.InferInput<typeof formSchema>>(
      {
        description: "",
        title: "",
      },
      valibotClient(formSchema)
    ),
    {
      SPA: true,
      onUpdate: async ({ form: submittedForm }) => {
        if (!submittedForm.valid) {
          return;
        }
        try {
          await submitChapter(submittedForm.data);
          toast.success("Chapter berhasil dibuat.", {
            position: "top-right",
          });
          await invalidateAll();
          handleOpenChange(false);
        } catch (error) {
          if (error instanceof ORPCError) {
            if (error.code === "UNAUTHORIZED") {
              await goto(resolve("/(auth)/login"));
              return;
            }
            toast.error(error.message, { position: "top-right" });
          } else if (error instanceof Error) {
            toast.error(error.message, { position: "top-right" });
          } else {
            toast.error("Chapter belum bisa dibuat. Coba lagi sebentar.", {
              position: "top-right",
            });
          }
        }
      },
      resetForm: true,
      validators: valibotClient(formSchema),
    }
  );

  const { form: formData, enhance, submitting, reset } = form;

  $effect(() => {
    if (dialogOpen) {
      reset();
    }
  });

  const titleCount = $derived(($formData.title ?? "").trim().length);
  const descriptionCount = $derived(($formData.description ?? "").length);
</script>

<Dialog.Root open={dialogOpen} onOpenChange={handleOpenChange}>
  <Dialog.Content showCloseButton={false}>
    <Dialog.Header>
      <Dialog.Title>Buat Chapter Baru</Dialog.Title>
      <Dialog.Description>
        Tambahkan chapter untuk mengelompokkan materi belajar.
      </Dialog.Description>
    </Dialog.Header>
    <form method="POST" class="flex flex-col gap-5" novalidate use:enhance>
      <Form.Field {form} name="title">
        <Form.Control>
          {#snippet children({ props })}
            <div class="flex items-center justify-between gap-3">
              <Form.Label>Judul</Form.Label>
              <span class="text-xs text-muted-foreground"
                >{titleCount}/{CHAPTER_TITLE_MAX_LENGTH}</span
              >
            </div>
            <Input
              {...props}
              bind:value={$formData.title}
              placeholder="Contoh: Pengenalan dasar"
              disabled={$submitting}
            />
          {/snippet}
        </Form.Control>
        <Form.Description>Judul chapter yang mudah dikenali.</Form.Description>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field {form} name="description">
        <Form.Control>
          {#snippet children({ props })}
            <div class="flex items-center justify-between gap-3">
              <Form.Label>Deskripsi</Form.Label>
              <span class="text-xs text-muted-foreground"
                >{descriptionCount}/{CHAPTER_DESCRIPTION_MAX_LENGTH}</span
              >
            </div>
            <Textarea
              {...props}
              bind:value={$formData.description}
              placeholder="Ringkasan isi chapter ini."
              rows={3}
              disabled={$submitting}
            />
          {/snippet}
        </Form.Control>
        <Form.Description
          >Opsional, tapi membantu memberi konteks.</Form.Description
        >
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
        {$submitting ? "Membuat..." : "Buat Chapter"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
