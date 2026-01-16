/**
 * Cloudflare KV Cache Implementation
 *
 * Cache implementation using Cloudflare KV for edge deployments.
 * KV is eventually consistent with low-latency reads globally.
 */

import type { ICacheRepository } from "../../domain/repositories/cache.repository.interface";

/**
 * Cloudflare KV Namespace interface
 * @see https://developers.cloudflare.com/kv/api/
 */
export interface KVNamespace {
	get(key: string, options?: { type?: "text" }): Promise<string | null>;
	get(key: string, options: { type: "json" }): Promise<unknown | null>;
	get(
		key: string,
		options: { type: "arrayBuffer" },
	): Promise<ArrayBuffer | null>;
	get(key: string, options: { type: "stream" }): Promise<ReadableStream | null>;
	put(
		key: string,
		value: string | ArrayBuffer | ReadableStream,
		options?: {
			expiration?: number;
			expirationTtl?: number;
			metadata?: unknown;
		},
	): Promise<void>;
	delete(key: string): Promise<void>;
	list(options?: {
		prefix?: string;
		limit?: number;
		cursor?: string;
	}): Promise<{
		keys: Array<{ name: string; expiration?: number; metadata?: unknown }>;
		list_complete: boolean;
		cursor?: string;
	}>;
}

export class KVCache implements ICacheRepository {
	constructor(private readonly kv: KVNamespace) {}

	async get<T>(key: string): Promise<T | null> {
		try {
			const value = await this.kv.get(key, { type: "json" });

			if (value === null) {
				return null;
			}

			return value as T;
		} catch {
			// If JSON parsing fails, try getting as text
			const textValue = await this.kv.get(key);
			if (textValue === null) {
				return null;
			}

			try {
				return JSON.parse(textValue) as T;
			} catch {
				return textValue as unknown as T;
			}
		}
	}

	async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
		const serialized = JSON.stringify(value);
		await this.kv.put(key, serialized, {
			expirationTtl: ttlSeconds,
		});
	}

	async delete(key: string): Promise<void> {
		await this.kv.delete(key);
	}

	async deleteMany(keys: string[]): Promise<void> {
		if (keys.length === 0) {
			return;
		}

		// KV doesn't support bulk delete, so we delete in parallel
		await Promise.all(keys.map((key) => this.kv.delete(key)));
	}

	async invalidateByPrefix(prefix: string): Promise<void> {
		const keysToDelete: string[] = [];
		let cursor: string | undefined;

		// Paginate through all keys with the given prefix
		do {
			const result = await this.kv.list({
				prefix,
				limit: 1000,
				cursor,
			});

			keysToDelete.push(...result.keys.map((k) => k.name));
			cursor = result.list_complete ? undefined : result.cursor;
		} while (cursor);

		// Delete all found keys in parallel
		if (keysToDelete.length > 0) {
			await this.deleteMany(keysToDelete);
		}
	}

	/**
	 * Check if the KV namespace is accessible
	 */
	async isHealthy(): Promise<boolean> {
		try {
			// Try to list with limit 1 to verify connectivity
			await this.kv.list({ limit: 1 });
			return true;
		} catch {
			return false;
		}
	}
}
