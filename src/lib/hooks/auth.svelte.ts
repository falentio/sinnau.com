import { browser } from '$app/environment';
import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	basePath: '/api/auth'
});

type _Session = (typeof authClient.$Infer)['Session'];
export type Session = _Session['session'];
export type User = _Session['user'];

let session = $state(null as Session | null);
let user = $state(null as User | null);
let isPending = $state(true);

let initialUser = $state(null as User | null);

if (browser) {
	authClient.useSession().subscribe((s) => {
		isPending = s.isPending;
		if (!isPending) {
			session = s.data?.session ?? null;
			user = s.data?.user ?? null;
		}
	});
}

export function setInitialUser(u: () => User | null) {
	initialUser = u();
}

export function getUser() {
	if (isPending) {
		return user || initialUser;
	}
	return user;
}

export function getSession() {
	return session;
}

export function getIsPending() {
	return isPending;
}
