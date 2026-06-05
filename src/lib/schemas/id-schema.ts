import * as v from 'valibot';

export function createPrefixedIdSchema(prefix: string) {
	return v.pipe(
		v.string(),
		v.regex(new RegExp(`^${prefix}_[a-z0-9]{2}[a-zA-Z0-9]{16}$`), `Format ID ${prefix} tidak valid`)
	);
}
