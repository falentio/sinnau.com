import { describe, it } from 'vitest';
import { searchParamsToRecord } from './searchparams.ts';

describe.concurrent('searchParamsToRecord', () => {
	it('returns an empty record for empty URLSearchParams', ({ expect }) => {
		const params = new URLSearchParams('');
		const result = searchParamsToRecord(params);

		expect(result).toEqual({});
	});

	it('converts a single key-value pair', ({ expect }) => {
		const params = new URLSearchParams('a=1');
		const result = searchParamsToRecord(params);

		expect(result).toEqual({ a: '1' });
	});

	it('converts multiple key-value pairs', ({ expect }) => {
		const params = new URLSearchParams('a=1&b=2&c=3');
		const result = searchParamsToRecord(params);

		expect(result).toEqual({ a: '1', b: '2', c: '3' });
	});

	it('filters out entries with empty values', ({ expect }) => {
		const params = new URLSearchParams('a=&b=2');
		const result = searchParamsToRecord(params);

		expect(result).toEqual({ b: '2' });
	});

	it('filters out all entries when all values are empty', ({ expect }) => {
		const params = new URLSearchParams('a=&b=&c=');
		const result = searchParamsToRecord(params);

		expect(result).toEqual({});
	});

	it('preserves non-empty values and drops empty ones', ({ expect }) => {
		const params = new URLSearchParams('a=&b=2&c=&d=4');
		const result = searchParamsToRecord(params);

		expect(result).toEqual({ b: '2', d: '4' });
	});

	it('decodes URL-encoded values', ({ expect }) => {
		const params = new URLSearchParams('q=hello%20world');
		const result = searchParamsToRecord(params);

		expect(result).toEqual({ q: 'hello world' });
	});

	it('preserves special characters in keys', ({ expect }) => {
		const params = new URLSearchParams('a-b=1');
		const result = searchParamsToRecord(params);

		expect(result).toEqual({ 'a-b': '1' });
	});

	it('preserves special characters in values', ({ expect }) => {
		const params = new URLSearchParams('a=hello%2Bworld');
		const result = searchParamsToRecord(params);

		expect(result).toEqual({ a: 'hello+world' });
	});

	it('handles a mix of empty and non-empty values with special characters', ({ expect }) => {
		const params = new URLSearchParams('name=John%20Doe&nickname=&role=admin');
		const result = searchParamsToRecord(params);

		expect(result).toEqual({ name: 'John Doe', role: 'admin' });
	});
});
