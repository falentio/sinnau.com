<script lang="ts">
  import { goto, invalidate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Form from "$lib/components/ui/form/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import * as Select from "$lib/components/ui/select/index.js";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";
  import { client } from "$lib/orpc";
  import { updateStudySetInputSchema } from "$lib/schemas/study-set";
  import { ORPCError } from "@orpc/client";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { defaults, superForm } from "sveltekit-superforms";
  import { valibotClient } from "sveltekit-superforms/adapters";
  import * as v from "valibot";

  interface Props {
    open: boolean;
    studySetId: string;
    studySet: {
      title: string;
      description: string | null;
      visibility: "PUBLIC" | "PRIVATE";
    };
  }

  let { open = $bindable(false), studySetId, studySet }: Props = $props();

  const init = untrack(() => ({
    description: studySet.description ?? "",
    title: studySet.title,
    visibility: studySet.visibility,
  }));

  const formSchema = v.omit(updateStudySetInputSchema, ["files", "id"]);

  const updateStudySet = async (data: v.InferOutput<typeof formSchema>) => {
    await client.studySet.update({
      ...data,
      id: studySetId,
    });
  };

  const form = superForm(
    defaults<v.InferInput<typeof formSchema>>(init, valibotClient(formSchema)),
    {
      SPA: true,
      onUpdate: async ({ form: submittedForm }) => {
        if (!submittedForm.valid) {
          return;
        }
        try {
          await updateStudySet(submittedForm.data);
          toast.success("Study set berhasil diperbarui.", {
            position: "top-right",
          });
          await invalidate(`study-set:${studySetId}`);
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
            toast.error(
              "Study set belum bisa diperbarui. Coba lagi sebentar.",
              { position: "top-right" }
            );
          }
        }
      },
      resetForm: true,
      validators: valibotClient(formSchema),
    }
  );

  const { form: formData, enhance, submitting, reset } = form;

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      reset();
    }
  };

  $effect(() => {
    if (open) {
      reset();
    }
  });

  const titleCount = $derived(($formData.title ?? "").length);
  const descriptionCount = $derived(($formData.description ?? "").length);
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content showCloseButton={!$submitting}>
    <Dialog.Header>
      <Dialog.Title>Edit Study Set</Dialog.Title>
      <Dialog.Description>Perbarui detail study set.</Dialog.Description>
    </Dialog.Header>
    <form method="POST" class="flex flex-col gap-5" novalidate use:enhance>
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
              placeholder="Judul study set"
              disabled={$submitting}
            />
          {/snippet}
        </Form.Control>
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
              placeholder="Deskripsi opsional"
              rows={3}
              disabled={$submitting}
            />
          {/snippet}
        </Form.Control>
        <Form.Description>Opsional, bisa dikosongkan.</Form.Description>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field {form} name="visibility">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Visibilitas</Form.Label>
            <Select.Root
              type="single"
              bind:value={$formData.visibility}
              disabled={$submitting}
            >
              <Select.Trigger {...props}>
                {$formData.visibility === "PUBLIC" ? "Public" : "Private"}
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="PUBLIC" label="Public" />
                <Select.Item value="PRIVATE" label="Private" />
              </Select.Content>
            </Select.Root>
          {/snippet}
        </Form.Control>
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
        {$submitting ? "Menyimpan..." : "Simpan"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
