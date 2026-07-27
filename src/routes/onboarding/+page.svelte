<script lang="ts" module>
  import * as v from "valibot";

  const formSchema = v.object({
    tosAccepted: v.pipe(
      v.boolean(),
      v.check((val) => val, "Kamu harus menyetujui Syarat & Ketentuan.")
    ),
  });

  type OnboardingForm = v.InferOutput<typeof formSchema>;
</script>

<script lang="ts">
  import { goto } from "$app/navigation";
  import AuthLayout from "$lib/components/features/auth/auth-layout.svelte";
  import SeoHead from "$lib/components/seo-head.svelte";
  import Checkbox from "$lib/components/ui/checkbox/checkbox.svelte";
  import * as Form from "$lib/components/ui/form/index.js";
  import { authClient } from "$lib/hooks/auth.svelte";
  import { defaults, superForm } from "sveltekit-superforms";
  import { valibotClient } from "sveltekit-superforms/adapters";

  let { data } = $props();

  let serverError = $state("");
  let pending = $state(false);

  const acceptTos = async () => {
    pending = true;
    try {
      const { error } = await authClient.updateUser({
        tosAcceptedAt: new Date(),
      });
      if (error) {
        serverError = error.message ?? "Gagal menyimpan persetujuan.";
        return;
      }
      await goto("/home");
    } catch (error) {
      serverError =
        (error as { message?: string }).message ??
        "Gagal menyimpan persetujuan.";
    } finally {
      pending = false;
    }
  };

  const form = superForm(
    defaults<OnboardingForm>({ tosAccepted: false }, valibotClient(formSchema)),
    {
      SPA: true,
      onUpdate: async ({ form: submittedForm }) => {
        serverError = "";
        if (!submittedForm.valid) {
          return;
        }
        await acceptTos();
      },
      resetForm: false,
      validators: valibotClient(formSchema),
    }
  );

  const { form: formData, enhance, submitting } = form;
</script>

<SeoHead
  title="Selamat Datang · Sinnau"
  description="Setujui Syarat & Ketentuan untuk mulai belajar."
  robots="noindex"
/>

<AuthLayout
  heading="Satu langkah lagi"
  description="Setujui ketentuan layanan untuk melanjutkan."
  gradient="bottom-right"
>
  <form class="flex flex-col gap-6" method="POST" use:enhance novalidate>
    <div class="flex flex-col gap-2 text-center">
      <h1 class="text-2xl font-semibold tracking-tight">Halo, {data.name}</h1>
      <p class="text-sm text-muted-foreground">
        Sebelum mulai, baca dan setujui Syarat & Ketentuan kami.
      </p>
    </div>

    {#if serverError}
      <div
        class="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {serverError}
      </div>
    {/if}

    <Form.Field {form} name="tosAccepted">
      <Form.Control>
        {#snippet children({ props })}
          <div class="flex items-start gap-3">
            <Checkbox
              {...props}
              bind:checked={$formData.tosAccepted}
              disabled={$submitting || pending}
              class="mt-0.5"
            />
            <Form.Label class="inline text-sm font-normal leading-snug">
              Saya telah membaca dan menyetujui
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary underline underline-offset-4"
              >
                Syarat & Ketentuan
              </a>
              serta
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary underline underline-offset-4"
              >
                Kebijakan Privasi
              </a>
              Sinnau.
            </Form.Label>
          </div>
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    <Form.Button
      class="w-full"
      disabled={$submitting || pending || !$formData.tosAccepted}
    >
      {$submitting || pending ? "Menyimpan..." : "Mulai Belajar"}
    </Form.Button>
  </form>
</AuthLayout>
