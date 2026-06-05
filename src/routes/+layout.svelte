<script lang="ts">
	import './layout.css';
	import { setInitialUser } from '$lib/hooks/auth.svelte';
	import type { LayoutProps } from './$types';
	const { children, data } = $props() as LayoutProps;
	setInitialUser(() => data.user);
</script>

{@render children()}
