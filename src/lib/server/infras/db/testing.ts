import { createDb } from '$lib/server/infras/db/client';

export function getTestingDb() {
	return createDb({ fileName: ':memory:' });
}
