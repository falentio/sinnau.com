import { client } from '$lib/orpc';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	locals.mustGetUser();
	const chapters = await client.chapter.list({ studySetId: params.studySetId });
	return { chapters };
};
