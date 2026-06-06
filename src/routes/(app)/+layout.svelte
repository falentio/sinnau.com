<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DialogContent from '$lib/components/ui/dialog/dialog-content.svelte';
	import DialogDescription from '$lib/components/ui/dialog/dialog-description.svelte';
	import DialogHeader from '$lib/components/ui/dialog/dialog-header.svelte';
	import DialogTitle from '$lib/components/ui/dialog/dialog-title.svelte';
	import Dialog from '$lib/components/ui/dialog/dialog.svelte';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import UsernameForm from '$lib/components/username-form.svelte';
	import { getUser } from '$lib/hooks/auth.svelte';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import {
		AiBeautifyIcon,
		Book03Icon,
		CrownIcon,
		Home01Icon,
		Search02Icon
	} from '@hugeicons/core-free-icons';
	import { HugeiconsIcon } from '@hugeicons/svelte';

	let { children } = $props();
	const isMobile = new IsMobile();
	const authRouteIds = ['/(auth)/login', '/(auth)/sign-up', '/login', '/sign-up'];
	const homeRouteIds = ['/(app)/home', '/(app)/subs/usage', '/(app)/subs/pricing'];
</script>

{#if authRouteIds.includes(page.route.id || '')}
	{@render children()}
{:else}
	<Sidebar.Provider open={!isMobile.current}>
		<AppSidebar />

		<Sidebar.Inset class="overflow-hidden">
			<ScrollArea class="flex max-h-svh flex-col md:max-h-[calc(100svh-1rem)]">
				<main
					class="group/app relative flex min-h-svh max-w-screen flex-1 flex-col bg-background md:min-h-[calc(100vh-1rem)]"
				>
					{@render children()}

					<div class="flex-auto"></div>
					<div class="sticky bottom-0 hidden group-has-data-[showbottombar=true]/app:flex">
						<div class="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-3">
							<div
								class="flex flex-row gap-3 rounded-full bg-popover p-1 text-popover-foreground shadow-xs inset-shadow-2xs inset-shadow-background/10"
							>
								<Button
									variant={page.route.id === '/(app)/home' ? 'outline' : 'ghost'}
									href="/home/"
									size="icon-lg"
								>
									<HugeiconsIcon icon={Home01Icon} />
								</Button>
								<Button variant="ghost" size="icon-lg">
									<HugeiconsIcon icon={Search02Icon} />
								</Button>
								<Button variant="default" size="icon-lg">
									<HugeiconsIcon icon={AiBeautifyIcon} />
								</Button>
								<Button variant="ghost" size="icon-lg">
									<HugeiconsIcon icon={Book03Icon} />
								</Button>
								<Button
									href="/subs/usage/"
									variant={page.route.id?.startsWith('/(app)/subs/') ? 'outline' : 'ghost'}
									size="icon-lg"
								>
									<HugeiconsIcon icon={CrownIcon} />
								</Button>
							</div>
						</div>
					</div>

					{#if browser && getUser() && !getUser()?.id}
						<Dialog open>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Pilih Username</DialogTitle>
									<DialogDescription>Silakan pilih username untuk akun Anda.</DialogDescription>
								</DialogHeader>
								<UsernameForm />
							</DialogContent>
						</Dialog>
					{/if}
				</main>
			</ScrollArea>
		</Sidebar.Inset>
		<Toaster />
	</Sidebar.Provider>
{/if}
