/**
 * Redis Cache Implementation
 *
 * Production-ready cache using Redis.
 * Supports pattern-based invalidation and TTL.
 */

import { Redis } from "ioredis";
import type { ICacheRepository } from "../../domain/repositories/cache.repository.interface";

export class RedisCache implements ICacheRepository {
	private readonly client: Redis;

	constructor(redisUrl: string) {
		this.client = new Redis(redisUrl, {
			maxRetriesPerRequest: 3,
			retryStrategy: (times: number) => {
				if (times > 3) {
					return null;
				}
				return Math.min(times * 100, 3000);
			},
		});

		this.client.on("error", (error: Error) => {
			console.error("Redis connection error:", error);
		});
	}

	async get<T>(key: string): Promise<T | null> {
		const value = await this.client.get(key);

		if (!value) {
			return null;
		}

		try {
			return JSON.parse(value) as T;
		} catch {
			return value as unknown as T;
		}
	}

	async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
		const serialized = JSON.stringify(value);
		await this.client.setex(key, ttlSeconds, serialized);
	}

	async delete(key: string): Promise<void> {
		await this.client.del(key);
	}

	async deleteMany(keys: string[]): Promise<void> {
		if (keys.length === 0) {
			return;
		}
		await this.client.del(...keys);
	}

	async invalidateByPrefix(prefix: string): Promise<void> {
		const stream = this.client.scanStream({
			match: `${prefix}*`,
			count: 100,
		});

		const keysToDelete: string[] = [];

		for await (const keys of stream) {
			keysToDelete.push(...(keys as string[]));
		}

		if (keysToDelete.length > 0) {
			await this.client.del(...keysToDelete);
		}
	}

	async isHealthy(): Promise<boolean> {
		try {
			const result = await this.client.ping();
			return result === "PONG";
		} catch {
			return false;
		}
	}

	async disconnect(): Promise<void> {
		await this.client.quit();
	}
}
