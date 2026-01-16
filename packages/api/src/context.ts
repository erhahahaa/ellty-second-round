import type { getDb } from "@ellty-second-round/db";
import type { Context as HonoContext } from "hono";
import { createContainer } from "./infrastructure";
import type { KVNamespace } from "./infrastructure/cache/kv.cache";

export type CreateContextOptions = {
	context: HonoContext;
	db: ReturnType<typeof getDb>;
};

/**
 * Cloudflare Workers bindings
 */
export interface CloudflareBindings {
	CACHE_KV?: KVNamespace;
}

/**
 * Creates a fresh context for each request.
 * This is crucial for serverless environments where connections
 * may be closed between requests.
 */
export async function createContext({ context, db }: CreateContextOptions) {
	// Create a fresh container (with its own db connection) per request
	const redisUrl = process.env.REDIS_URL;

	// Get Cloudflare bindings if running in Workers environment
	const bindings = context.env as CloudflareBindings | undefined;

	const container = createContainer({
		redis: redisUrl ? { url: redisUrl } : undefined,
		kv: bindings?.CACHE_KV,
		logger: console,
		db,
	});

	const session = await container.auth.api.getSession({
		headers: context.req.raw.headers,
	});

	return {
		session,
		// Inject services from DI container
		calculationService: container.calculationService,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
