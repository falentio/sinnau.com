<script lang="ts" module>
  import * as v from "valibot";

  const nameSchema = v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Nama wajib diisi."),
    v.maxLength(64, "Nama maksimal 64 karakter.")
  );

  const formSchema = v.object({ name: nameSchema });

  type ProfileNameForm = v.InferOutput<typeof formSchema>;
</script>

<script lang="ts">
  import * as Form from "$lib/components/ui/form/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import { authClient, getUser } from "$lib/hooks/auth.svelte";
  import { toast } from "svelte-sonner";
  import { defaults, superForm } from "sveltekit-superforms";
  import { valibotClient } from "sveltekit-superforms/adapters";

  const user = getUser;

  const getErrorMessage = (error: { message?: string } | null | undefined) => {
    if (error?.message) {
      return error.message;
    }
    return "Nama belum bisa diperbarui. Coba lagi sebentar.";
  };

  const updateName = async (name: string) => {
    try {
      const { error } = await authClient.updateUser({ name });
      if (error) {
        toast.error(getErrorMessage(error), { position: "top-right" });
        return;
      }
      toast.success("Nama berhasil diperbarui.", { position: "top-right" });
    } catch (error) {
      toast.error(getErrorMessage(error as { message?: string }), {
        position: "top-right",
      });
    }
  };

  const form = superForm(
    defaults<ProfileNameForm>(
      { name: user()?.name ?? "" },
      valibotClient(formSchema)
    ),
    {
      SPA: true,
      validators: valibotClient(formSchema),
    }
  );

  const { form: formData } = form;

  $effect(() => {
    const parsed = v.safeParse(nameSchema, $formData.name);
    if (!parsed.success || parsed.output === (user()?.name ?? "")) {
      return;
    }
    const name = parsed.output;
    const timer = setTimeout(() => {
      void updateName(name);
    }, 500);
    return () => {
      clearTimeout(timer);
    };
  });
</script>

<div class="flex flex-col gap-4">
  <Form.Field {form} name="name">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Nama</Form.Label>
        <Input
          {...props}
          type="text"
          placeholder="Nama kamu"
          bind:value={$formData.name}
        />
      {/snippet}
    </Form.Control>
    <Form.Description>
      Nama ini yang dilihat teman-temanmu. Perubahan disimpan otomatis.
    </Form.Description>
    <Form.FieldErrors />
  </Form.Field>
</div>
