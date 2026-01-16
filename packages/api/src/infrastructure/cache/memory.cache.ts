/**
 * Memory Cache Implementation
 *
 * In-memory cache for development and testing.
 * Not suitable for production with multiple instances.
 */

import type { ICacheRepository } from "../../domain/repositories/cache.repository.interface";

interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

export class MemoryCache implements ICacheRepository {
	private store = new Map<string, CacheEntry<unknown>>();

	async get<T>(key: string): Promise<T | null> {
		const entry = this.store.get(key);

		if (!entry) {
			return null;
		}

		// Check if expired
		if (Date.now() > entry.expiresAt) {
			this.store.delete(key);
			return null;
		}

		return entry.value as T;
	}

	async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
		this.store.set(key, {
			value,
			expiresAt: Date.now() + ttlSeconds * 1000,
		});
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
	}

	async deleteMany(keys: string[]): Promise<void> {
		for (const key of keys) {
			this.store.delete(key);
		}
	}

	async invalidateByPrefix(prefix: string): Promise<void> {
		const keysToDelete: string[] = [];

		for (const key of this.store.keys()) {
			if (key.startsWith(prefix)) {
				keysToDelete.push(key);
			}
		}

		for (const key of keysToDelete) {
			this.store.delete(key);
		}
	}

	/**
	 * Clear all entries (useful for testing)
	 */
	clear(): void {
		this.store.clear();
	}

	/**
	 * Get the number of entries (useful for testing)
	 */
	size(): number {
		return this.store.size;
	}
}
