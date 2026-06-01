import { defineConfig } from 'drizzle-kit';

const url = process.env.DB_FILE_NAME ?? '.data/data.db';

export default defineConfig({
	schema: './src/lib/server/infras/db/schema/index.ts',
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: { url }
});
