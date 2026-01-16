import { env } from "@ellty-second-round/env/server";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Creates a new database connection.
 * For serverless environments, each request should get its own connection.
 * Returns both the drizzle instance and a close function.
 */
export const getDb = () => {
	const client = postgres(env.DATABASE_URL, {
		// Use a single connection per request (serverless-friendly)
		max: 1,
		// Disable prepared statements - required for environments like
		// Cloudflare Workers/miniflare where connections may be dropped
		prepare: false,
		// Automatically reconnect on connection errors
		connect_timeout: 10,
		// Close idle connections immediately to prevent stale connections
		idle_timeout: 0,
		// Disable connection lifetime management (we close after each request)
		max_lifetime: null,
	});

	const db = drizzle({ client, schema });

	return {
		db,
		close: () => client.end(),
	};
};

// Export schema for use in other packages
export { schema };

// Export types
export type Database = ReturnType<typeof getDb>["db"];
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
