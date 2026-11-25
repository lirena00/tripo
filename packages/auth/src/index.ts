import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@tripo/db";
import { account, session, user, verification } from "@tripo/db/schema/auth";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

export interface AuthConfig {
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
}

export function createAuth(env: AuthConfig, database: Database) {
	return betterAuth({
		baseURL: env.BETTER_AUTH_URL,
		database: drizzleAdapter(database, {
			provider: "pg",
			schema: { account, session, user, verification },
			transaction: true,
		}),
		emailAndPassword: { enabled: true },
		plugins: [nextCookies()],
		secret: env.BETTER_AUTH_SECRET,
		trustedOrigins: [env.BETTER_AUTH_URL],
	});
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
