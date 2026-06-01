<script lang="ts">
	import './layout.css';
	import type { LayoutProps } from './$types';
	import { setInitialUser } from '$lib/hooks/auth.svelte';
	const { children, data } = $props() as LayoutProps;
	setInitialUser(() => data.user);
</script>

{@render children()}
