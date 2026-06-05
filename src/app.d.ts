// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Auth } from '$lib/server/infras/auth/index.ts';

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
			data?: unknown;
		}
		interface Locals {
			user: Auth['$Infer']['Session']['user'] | null;
			session: Auth['$Infer']['Session']['session'] | null;
			mustGetUser(): NonNullable<Auth['$Infer']['Session']['user']>;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
