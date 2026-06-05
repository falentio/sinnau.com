import { dev } from '$app/environment';
import { client } from '$lib/orpc';
import { getFlashcardStubs } from '$lib/server/services/flashcard/flashcard.utils';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const VALID_FILTERS = new Set(['latest']);
const DEV_STUB_FILTERS = new Set(['empty', 'paginated', '500']);

export const load: PageServerLoad = async ({ url, params, locals }) => {
	const user = locals.mustGetUser();
	const filter = url.searchParams.get('filter');

	if (filter !== null && !VALID_FILTERS.has(filter) && !(dev && DEV_STUB_FILTERS.has(filter))) {
		error(400, { message: 'filter unknown' });
	}

	if (dev) {
		if (filter === 'empty') {
			return { flashcards: [], filter };
		}
		if (filter === '500') {
			await client.unimplemented();
		}
		if (filter === 'paginated') {
			return {
				flashcards: getFlashcardStubs(50, params.studySetId, user.id),
				filter
			};
		}
	}

	const flashcards = await client.flashcard.list({
		studySetId: params.studySetId
	});
	return { flashcards, filter };
};
