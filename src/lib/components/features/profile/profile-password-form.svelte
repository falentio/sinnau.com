<script lang="ts" module>
  import * as v from "valibot";

  const formSchema = v.pipe(
    v.object({
      confirmPassword: v.pipe(
        v.string(),
        v.minLength(1, "Konfirmasi kata sandi wajib diisi.")
      ),
      currentPassword: v.pipe(
        v.string(),
        v.minLength(1, "Kata sandi saat ini wajib diisi.")
      ),
      newPassword: v.pipe(
        v.string(),
        v.trim(),
        v.minLength(8, "Kata sandi minimal 8 karakter."),
        v.maxLength(128, "Kata sandi maksimal 128 karakter.")
      ),
    }),
    v.forward(
      v.partialCheck(
        [["newPassword"], ["confirmPassword"]],
        (input) => input.newPassword === input.confirmPassword,
        "Konfirmasi kata sandi tidak cocok."
      ),
      ["confirmPassword"]
    )
  );

  type ProfilePasswordForm = v.InferOutput<typeof formSchema>;
</script>

<script lang="ts">
  import * as Form from "$lib/components/ui/form/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import { authClient } from "$lib/hooks/auth.svelte";
  import { getErrorMessage } from "$lib/utils/error-messages";
  import { toast } from "svelte-sonner";
  import { defaults, superForm } from "sveltekit-superforms";
  import { valibotClient } from "sveltekit-superforms/adapters";

  let pending = $state(false);

  const changePassword = async (data: ProfilePasswordForm) => {
    pending = true;
    try {
      const { error } = await authClient.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: false,
      });
      if (error) {
        toast.error(getErrorMessage(error), { position: "top-right" });
        return false;
      }
      toast.success("Kata sandi berhasil diubah.", { position: "top-right" });
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error), {
        position: "top-right",
      });
      return false;
    } finally {
      pending = false;
    }
  };

  const form = superForm(
    defaults<ProfilePasswordForm>(
      { confirmPassword: "", currentPassword: "", newPassword: "" },
      valibotClient(formSchema)
    ),
    {
      SPA: true,
      onUpdate: async ({ form: submittedForm }) => {
        if (!submittedForm.valid) {
          return;
        }
        const success = await changePassword(submittedForm.data);
        if (success) {
          form.reset();
        }
      },
      resetForm: false,
      validators: valibotClient(formSchema),
    }
  );

  const { form: formData, enhance, submitting } = form;
</script>

<form class="flex flex-col gap-4" method="POST" use:enhance novalidate>
  <Form.Field {form} name="currentPassword">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Kata sandi saat ini</Form.Label>
        <Input
          {...props}
          type="password"
          bind:value={$formData.currentPassword}
          disabled={$submitting || pending}
        />
      {/snippet}
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="newPassword">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Kata sandi baru</Form.Label>
        <Input
          {...props}
          type="password"
          bind:value={$formData.newPassword}
          disabled={$submitting || pending}
        />
      {/snippet}
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="confirmPassword">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Konfirmasi kata sandi baru</Form.Label>
        <Input
          {...props}
          type="password"
          bind:value={$formData.confirmPassword}
          disabled={$submitting || pending}
        />
      {/snippet}
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  <Form.Button class="w-fit" disabled={$submitting || pending}>
    {$submitting || pending ? "Mengubah..." : "Ubah kata sandi"}
  </Form.Button>
</form>
