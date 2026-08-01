<script lang="ts">
  import "./layout.css";
  import PosthogIdentify from "$lib/components/features/analytics/posthog-identify.svelte";
  import { setInitialUser } from "$lib/hooks/auth.svelte";

  import type { LayoutProps } from "./$types";

  const { children, data } = $props() as LayoutProps;
  setInitialUser(() => data.user);
</script>

<PosthogIdentify />

{@render children()}
