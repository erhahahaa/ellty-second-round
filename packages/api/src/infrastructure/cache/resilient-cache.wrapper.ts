/**
 * Resilient Cache Wrapper
 *
 * Wraps any cache implementation with graceful error handling.
 * If cache operations fail, they are logged but don't break the app.
 * Implements the Decorator pattern.
 */

import type { ICacheRepository } from "../../domain/repositories/cache.repository.interface";

export interface Logger {
	warn: (message: string, error?: unknown) => void;
}

const defaultLogger: Logger = {
	warn: (message: string, error?: unknown) => {
		console.warn(`[Cache Warning] ${message}`, error);
	},
};

export class ResilientCacheWrapper implements ICacheRepository {
	constructor(
		private readonly cache: ICacheRepository,
		private readonly logger: Logger = defaultLogger,
	) {}

	async get<T>(key: string): Promise<T | null> {
		try {
			return await this.cache.get<T>(key);
		} catch (error) {
			this.logger.warn(`GET failed for key: ${key}`, error);
			return null; // Treat as cache miss
		}
	}

	async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
		try {
			await this.cache.set(key, value, ttlSeconds);
		} catch (error) {
			this.logger.warn(`SET failed for key: ${key}`, error);
			// Don't throw - write succeeded to DB, cache is non-critical
		}
	}

	async delete(key: string): Promise<void> {
		try {
			await this.cache.delete(key);
		} catch (error) {
			this.logger.warn(`DELETE failed for key: ${key}`, error);
		}
	}

	async deleteMany(keys: string[]): Promise<void> {
		try {
			await this.cache.deleteMany(keys);
		} catch (error) {
			this.logger.warn(
				`DELETE_MANY failed for keys: ${keys.join(", ")}`,
				error,
			);
		}
	}

	async invalidateByPrefix(prefix: string): Promise<void> {
		try {
			await this.cache.invalidateByPrefix(prefix);
		} catch (error) {
			this.logger.warn(`INVALIDATE_PREFIX failed for: ${prefix}`, error);
		}
	}
}
