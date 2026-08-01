<script lang="ts">
  import { env } from "$env/dynamic/public";
  import { getUser } from "$lib/hooks/auth.svelte";
  import posthog from "posthog-js";

  const posthogEnabled =
    env.PUBLIC_POSTHOG_KEY !== undefined && env.PUBLIC_POSTHOG_KEY !== "";

  let identified = false;

  $effect(() => {
    if (!posthogEnabled) {
      return;
    }
    const u = getUser();
    if (u) {
      identified = true;
      posthog.identify(u.id, {
        email: u.email,
        is_admin: u.role === "admin",
        name: u.name,
      });
    } else if (identified) {
      identified = false;
      posthog.reset();
    }
  });
</script>
