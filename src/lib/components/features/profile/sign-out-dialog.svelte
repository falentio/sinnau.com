<script lang="ts">
  import { goto } from "$app/navigation";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { authClient } from "$lib/hooks/auth.svelte";

  interface Props {
    open: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  let submitting = $state(false);

  const handleSignOut = async () => {
    submitting = true;
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            void goto("/login");
          },
        },
      });
    } finally {
      submitting = false;
    }
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Content showCloseButton={!submitting}>
    <Dialog.Header>
      <Dialog.Title>Keluar dari akun</Dialog.Title>
      <Dialog.Description>
        Kamu akan keluar dari akun Sinnau-mu. Kamu bisa masuk kembali kapan
        saja.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Dialog.Close>
        {#snippet child({ props: closeProps })}
          <Button {...closeProps} variant="outline" disabled={submitting}>
            Batal
          </Button>
        {/snippet}
      </Dialog.Close>
      <Button
        variant="destructive"
        onclick={handleSignOut}
        disabled={submitting}
      >
        {submitting ? "Keluar..." : "Keluar"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
