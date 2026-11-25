import "varlock/auto-load";

import { fileURLToPath } from "node:url";
import { NeonDatabase } from "drizzle-orm/neon-serverless";
import { migrate as migrateNeon } from "drizzle-orm/neon-serverless/migrator";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { ENV } from "./env";
import { createDb } from "./index";

const db = createDb({
	DATABASE_URL: ENV.DATABASE_URL_UNPOOLED || ENV.DATABASE_URL,
});
const config = {
	migrationsFolder: fileURLToPath(new URL("./migrations", import.meta.url)),
};

try {
	if (db instanceof NeonDatabase) {
		await migrateNeon(db, config);
	} else {
		await migrate(db, config);
	}
	process.stdout.write("Database migrations are up to date.\n");
} finally {
	await db.$client.end();
}
