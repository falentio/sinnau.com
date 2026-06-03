import { redirect, type Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { auth } from '$lib/server/infras/auth';
import { sequence } from '@sveltejs/kit/hooks';

const betterAuthHandle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}
	return svelteKitHandler({ event, resolve, auth, building });
};

const guardedRoutes: Array<(routeId: string) => boolean> = [
	(routeId) => routeId.includes('/(app)/')
];

const authGuardHandle: Handle = async ({ event, resolve }) => {
	const routeId = event.route?.id ?? '';
	const requiresAuth = guardedRoutes.some((guard) => guard(routeId));
	const loggedIn = !!event.locals.session;

	if (requiresAuth && !loggedIn) {
		redirect(302, '/login');
	}

	return resolve(event);
};

export const handle = sequence(betterAuthHandle, authGuardHandle);
