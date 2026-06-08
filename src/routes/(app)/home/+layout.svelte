<script lang="ts">
  import HomeHeader from "$lib/components/features/home/home-header.svelte";

  let { children } = $props();
</script>

<div data-showbottombar="true"></div>

<HomeHeader />

{@render children()}
