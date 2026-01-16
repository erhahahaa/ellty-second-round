/**
 * Dependency Injection Container
 *
 * Creates and wires up all infrastructure dependencies.
 * Supports different environments (dev, production, test).
 */

import { type Auth, createAuth } from "@ellty-second-round/auth";
import type { getDb } from "@ellty-second-round/db";
import type { ICacheRepository } from "../domain";
import { CalculationService } from "../domain";
import { KVCache, type KVNamespace } from "./cache/kv.cache";
import { MemoryCache } from "./cache/memory.cache";
import { RedisCache } from "./cache/redis.cache";
import {
	type Logger,
	ResilientCacheWrapper,
} from "./cache/resilient-cache.wrapper";
import { DrizzleUnitOfWork } from "./persistence/drizzle-unit-of-work";

export interface Container {
	calculationService: CalculationService;
	cache: ICacheRepository;
	auth: Auth;
}

export interface ContainerConfig {
	redis?: {
		url: string;
	};
	kv?: KVNamespace;
	logger?: Logger;
	db: ReturnType<typeof getDb>;
}

/**
 * Creates a fully wired dependency container
 * Each container gets its own database connection for serverless compatibility.
 *
 * @param config - Configuration options
 * @returns Container with all services
 */
export function createContainer(config: ContainerConfig): Container {
	const { db, close: closeDb } = config.db;

	// Create auth instance with shared db connection
	const auth = createAuth(db);

	// Create Unit of Work (transaction manager)
	const unitOfWork = new DrizzleUnitOfWork(db);

	// Create cache implementation based on config
	// Priority: KV (Cloudflare) > Redis > Memory
	let cache: ICacheRepository;

	if (config.kv) {
		// Cloudflare Workers: Use KV with resilient wrapper
		const kvCache = new KVCache(config.kv);
		cache = new ResilientCacheWrapper(kvCache, config.logger);
	} else if (config.redis?.url) {
		// Production: Use Redis with resilient wrapper
		const redisCache = new RedisCache(config.redis.url);
		cache = new ResilientCacheWrapper(redisCache, config.logger);
	} else {
		// Development/Test: Use in-memory cache
		const memoryCache = new MemoryCache();
		cache = new ResilientCacheWrapper(memoryCache, config.logger);
	}

	// Create services
	const calculationService = new CalculationService(unitOfWork, cache);

	return {
		calculationService,
		cache,
		auth,
	};
}

// Singleton container instance (lazily initialized)
let containerInstance: Container | null = null;

/**
 * Get or create the singleton container instance
 * Uses environment variables to configure Redis
 */
export function getContainer(db: ReturnType<typeof getDb>): Container {
	if (!containerInstance) {
		const redisUrl = process.env.REDIS_URL;

		containerInstance = createContainer({
			redis: redisUrl ? { url: redisUrl } : undefined,
			logger: console,
			db,
		});
	}

	return containerInstance;
}

/**
 * Reset the container (useful for testing)
 */
export async function resetContainer(): Promise<void> {
	if (containerInstance) {
		containerInstance = null;
	}
}
