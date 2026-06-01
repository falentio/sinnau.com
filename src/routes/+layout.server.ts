import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ depends, locals }) => {
	depends('app:auth');
	return { user: locals.user };
};
