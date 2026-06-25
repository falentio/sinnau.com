<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import {
    ArrowDown01Icon,
    ArrowLeft01Icon,
    ArrowUp01Icon,
    Delete02Icon,
    FileUploadIcon,
  } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Form from "$lib/components/ui/form/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import * as Select from "$lib/components/ui/select/index.js";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";
  import { client } from "$lib/orpc";
  import type { CreateGenerateInput } from "$lib/schemas/generate";
  import { createGenerateInputSchema } from "$lib/schemas/generate";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { ORPCError } from "@orpc/client";
  import { toast } from "svelte-sonner";
  import { defaults, superForm } from "sveltekit-superforms";
  import { valibotClient } from "sveltekit-superforms/adapters";

  type Visibility = "PUBLIC" | "PRIVATE";

  const visibilityItems: { value: Visibility; label: string }[] = [
    { label: "Privat", value: "PRIVATE" },
    { label: "Publik", value: "PUBLIC" },
  ];

  const extractionTypeItems: { value: string; label: string }[] = [
    { label: "Normal", value: "normal" },
    { label: "Exhaustive", value: "exhaustive" },
  ];

  let advancedMode = $state(false);
  let selectedPdf = $state<File | null>(null);

  const submitGenerate = async (data: CreateGenerateInput) => {
    try {
      const result = await client.generate.create(data);
      toast.success("Pembuatan modul dimulai.", {
        position: "top-right",
      });
      await goto(
        resolve("/(app)/study/[studySetId]/waiting-room", {
          studySetId: result.studySetId,
        })
      );
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
        toast.error("Pembuatan modul gagal. Coba lagi sebentar.", {
          position: "top-right",
        });
      }
    }
  };

  const form = superForm(
    defaults<CreateGenerateInput>(
      {
        description: "",
        pdf: undefined as unknown as File,
        title: "",
        visibility: "PRIVATE",
      },
      valibotClient(createGenerateInputSchema)
    ),
    {
      SPA: true,
      onUpdate: async ({ form: submittedForm }) => {
        if (!submittedForm.valid) {
          return;
        }
        await submitGenerate(submittedForm.data);
      },
      resetForm: false,
      validators: valibotClient(createGenerateInputSchema),
    }
  );

  const { form: formData, enhance, submitting } = form;
  const titleCount = $derived($formData.title.trim().length);
  const descriptionCount = $derived(($formData.description ?? "").length);
  const selectedVisibilityLabel = $derived(
    visibilityItems.find((item) => item.value === $formData.visibility)
      ?.label ?? "Pilih visibilitas"
  );
  const selectedExtractionTypeLabel = $derived(
    extractionTypeItems.find((item) => item.value === $formData.extractionType)
      ?.label ?? "Normal"
  );

  const handlePdfChange = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      selectedPdf = file;
      $formData.pdf = file;
    }
  };

  const removePdf = () => {
    selectedPdf = null;
    $formData.pdf = undefined as unknown as File;
  };
</script>

<svelte:head>
  <title>Buat Modul dengan AI</title>
</svelte:head>

<div class="mx-auto w-full max-w-2xl px-3">
  <Button variant="ghost" href="/home">
    <HugeiconsIcon icon={ArrowLeft01Icon} />
    Kembali</Button
  >
</div>

<form
  method="POST"
  class="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 px-6 py-6"
  novalidate
  use:enhance
>
  <Form.Field {form} name="title">
    <Form.Control>
      {#snippet children({ props })}
        <div class="flex items-center justify-between gap-3">
          <Form.Label>Judul</Form.Label>
          <span class="text-xs text-muted-foreground">{titleCount}/50</span>
        </div>
        <Input
          {...props}
          bind:value={$formData.title}
          placeholder="Contoh: Aljabar Linear Dasar"
          disabled={$submitting}
        />
      {/snippet}
    </Form.Control>
    <Form.Description>Gunakan judul yang mudah dikenali.</Form.Description>
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="description">
    <Form.Control>
      {#snippet children({ props })}
        <div class="flex items-center justify-between gap-3">
          <Form.Label>Deskripsi</Form.Label>
          <span class="text-xs text-muted-foreground"
            >{descriptionCount}/2000</span
          >
        </div>
        <Textarea
          {...props}
          bind:value={$formData.description}
          placeholder="Ringkas isi modul, tujuan belajar, atau topik yang akan dibahas."
          disabled={$submitting}
        />
      {/snippet}
    </Form.Control>
    <Form.Description>Opsional, tapi membantu memberi konteks.</Form.Description
    >
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="visibility">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Visibilitas</Form.Label>
        <Select.Root
          type="single"
          name="visibility"
          items={visibilityItems}
          bind:value={$formData.visibility}
          disabled={$submitting}
        >
          <Select.Trigger
            {...props}
            class="w-full"
            aria-label="Pilih visibilitas"
          >
            <span class="min-w-0 flex-1 truncate text-left"
              >{selectedVisibilityLabel}</span
            >
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Label>Visibilitas</Select.Label>
              {#each visibilityItems as item (item.value)}
                <Select.Item value={item.value} label={item.label}>
                  {item.label}
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      {/snippet}
    </Form.Control>
    <Form.Description
      >Privat hanya untukmu, publik bisa diakses lewat tautan langsung.</Form.Description
    >
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="pdf">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>File PDF</Form.Label>
        <div class="flex flex-col gap-3">
          <Input
            {...props}
            type="file"
            accept=".pdf"
            class="hidden"
            id="pdf-input"
            disabled={$submitting}
            onchange={handlePdfChange}
          />
          <label
            for="pdf-input"
            class="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-3xl border border-input bg-background px-4 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            <HugeiconsIcon icon={FileUploadIcon} />
            <span>{selectedPdf ? "Ganti file" : "Pilih file PDF"}</span>
          </label>
          {#if selectedPdf}
            <div
              class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span class="truncate">{selectedPdf.name}</span>
              <button
                type="button"
                onclick={removePdf}
                class="text-muted-foreground hover:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} class="size-4" />
              </button>
            </div>
          {/if}
        </div>
      {/snippet}
    </Form.Control>
    <Form.Description
      >Unggah materi dalam format PDF (maks. 30 MB).</Form.Description
    >
    <Form.FieldErrors />
  </Form.Field>

  <button
    type="button"
    onclick={() => (advancedMode = !advancedMode)}
    class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
  >
    <HugeiconsIcon icon={advancedMode ? ArrowUp01Icon : ArrowDown01Icon} />
    <span>Mode Lanjutan</span>
  </button>

  {#if advancedMode}
    <Form.Field {form} name="extractionType">
      <Form.Control>
        <Form.Label>Tipe Ekstraksi</Form.Label>
        <Select.Root
          type="single"
          name="extractionType"
          items={extractionTypeItems}
          bind:value={$formData.extractionType}
          disabled={$submitting}
        >
          <Select.Trigger class="w-full" aria-label="Pilih tipe ekstraksi">
            <span class="min-w-0 flex-1 truncate text-left"
              >{selectedExtractionTypeLabel}</span
            >
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Label>Tipe Ekstraksi</Select.Label>
              {#each extractionTypeItems as item (item.value)}
                <Select.Item value={item.value} label={item.label}>
                  {item.label}
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </Form.Control>
      <Form.Description
        >Normal untuk hasil ringkas, Exhaustive untuk hasil lebih mendalam.</Form.Description
      >
      <Form.FieldErrors />
    </Form.Field>

    <Form.Field {form} name="languageStyle">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Gaya Bahasa</Form.Label>
          <Input
            {...props}
            bind:value={$formData.languageStyle}
            placeholder="Contoh: id, en, jv"
            disabled={$submitting}
          />
        {/snippet}
      </Form.Control>
      <Form.Description
        >Opsional. Kode bahasa untuk gaya penulisan (contoh: `id` untuk
        Indonesia).</Form.Description
      >
      <Form.FieldErrors />
    </Form.Field>
  {/if}

  <div class="mt-auto flex flex-col gap-2 sm:flex-row sm:justify-end">
    <Button
      class="w-full sm:w-auto"
      variant="outline"
      href="/home"
      disabled={$submitting}
    >
      Batal
    </Button>
    <Form.Button class="w-full sm:w-auto" disabled={$submitting}>
      {$submitting ? "Membuat..." : "Hasilkan Modul"}
    </Form.Button>
  </div>
</form>
