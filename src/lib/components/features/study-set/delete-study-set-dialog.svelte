<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Form from "$lib/components/ui/form/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import { client } from "$lib/orpc";
  import { ORPCError } from "@orpc/client";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { defaults, superForm } from "sveltekit-superforms";
  import { valibotClient } from "sveltekit-superforms/adapters";
  import * as v from "valibot";

  interface Props {
    open: boolean;
    studySetId: string;
    studySetTitle: string;
  }

  let { open = $bindable(false), studySetId, studySetTitle }: Props = $props();

  const formSchema = v.object({
    confirmation: v.pipe(
      v.string(),
      v.minLength(1, "Harus diisi"),
      v.check(
        (input) => input.trim() === untrack(() => studySetTitle),
        `Ketik "${untrack(() => studySetTitle)}" untuk mengonfirmasi`
      )
    ),
  });

  const deleteStudySet = async () => {
    await client.studySet.delete({ id: studySetId });
  };

  const form = superForm(
    defaults<v.InferInput<typeof formSchema>>(
      { confirmation: "" },
      valibotClient(formSchema)
    ),
    {
      SPA: true,
      onUpdate: async ({ form: submittedForm }) => {
        if (!submittedForm.valid) {
          return;
        }
        try {
          await deleteStudySet();
          toast.success("Study set berhasil dihapus.", {
            position: "top-right",
          });
          await goto(resolve("/home/"));
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
            toast.error("Study set belum bisa dihapus. Coba lagi sebentar.", {
              position: "top-right",
            });
          }
        }
      },
      resetForm: true,
      validators: valibotClient(formSchema),
    }
  );

  const { form: formData, enhance, submitting, reset, errors } = form;

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
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content showCloseButton={!$submitting}>
    <Dialog.Header>
      <Dialog.Title>Hapus Study Set</Dialog.Title>
      <Dialog.Description>
        Study set yang dihapus masih bisa diakses oleh pengguna yang pernah
        membukanya. Kamu bisa mengembalikannya nanti.
      </Dialog.Description>
    </Dialog.Header>
    <form method="POST" class="flex flex-col gap-5" novalidate use:enhance>
      <Form.Field {form} name="confirmation">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>
              Ketik
              <span class="mx-1 font-semibold text-foreground"
                >{studySetTitle}</span
              >
              untuk mengonfirmasi:
            </Form.Label>
            <Input
              {...props}
              bind:value={$formData.confirmation}
              placeholder={studySetTitle}
              disabled={$submitting}
            />
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
      <Button
        variant="destructive"
        onclick={() => form.submit()}
        disabled={$errors.confirmation !== undefined || $submitting}
      >
        {$submitting ? "Menghapus..." : "Hapus"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
