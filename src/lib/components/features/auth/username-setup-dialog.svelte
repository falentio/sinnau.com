<script lang="ts">
  import { browser } from "$app/environment";
  import DialogContent from "$lib/components/ui/dialog/dialog-content.svelte";
  import DialogDescription from "$lib/components/ui/dialog/dialog-description.svelte";
  import DialogHeader from "$lib/components/ui/dialog/dialog-header.svelte";
  import DialogTitle from "$lib/components/ui/dialog/dialog-title.svelte";
  import Dialog from "$lib/components/ui/dialog/dialog.svelte";
  import UsernameForm from "$lib/components/username-form.svelte";
  import { getUser } from "$lib/hooks/auth.svelte";
</script>

{#if browser && getUser() && !getUser()?.id}
  <Dialog open>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Pilih Username</DialogTitle>
        <DialogDescription
          >Silakan pilih username untuk akun Anda.</DialogDescription
        >
      </DialogHeader>
      <UsernameForm />
    </DialogContent>
  </Dialog>
{/if}
