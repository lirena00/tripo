import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle } from "drizzle-orm/node-postgres";

import type { DatabaseConfig } from "./config";
import { relations } from "./relations";

export function createDb(env: DatabaseConfig) {
	if (new URL(env.DATABASE_URL).hostname.endsWith(".neon.tech")) {
		return drizzleNeon({
			connection: {
				connectionString: env.DATABASE_URL,
				connectionTimeoutMillis: 10_000,
			},
			relations,
		});
	}

	return drizzle(env.DATABASE_URL, { relations });
}

export type Database = ReturnType<typeof createDb>;
