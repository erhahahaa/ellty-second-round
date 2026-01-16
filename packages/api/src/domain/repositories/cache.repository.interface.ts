/**
 * Cache Repository Interface
 *
 * Abstraction for caching layer - can be implemented by Redis, Cloudflare KV, Memory, etc.
 * Follows Interface Segregation Principle - small, focused interface.
 */

export interface ICacheRepository {
	/**
	 * Get a value from cache
	 * @returns The cached value or null if not found/expired
	 */
	get<T>(key: string): Promise<T | null>;

	/**
	 * Set a value in cache
	 * @param ttlSeconds Time to live in seconds (default: 300 = 5 minutes)
	 */
	set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

	/**
	 * Delete a single key from cache
	 */
	delete(key: string): Promise<void>;

	/**
	 * Delete multiple keys from cache
	 */
	deleteMany(keys: string[]): Promise<void>;

	/**
	 * Delete all keys matching a prefix
	 * Note: Implementation varies by cache provider
	 */
	invalidateByPrefix(prefix: string): Promise<void>;
}

/**
 * Cache key constants for the calculation domain
 */
export const CacheKeys = {
	/** Full calculation tree (denormalized) */
	FULL_TREE: "calc:tree:full",

	/** List of all root IDs */
	ROOT_LIST: "calc:roots",

	/** Individual root by ID */
	ROOT: (id: string) => `calc:root:${id}`,

	/** Operations directly under a root */
	ROOT_OPERATIONS: (rootId: string) => `calc:root:${rootId}:ops`,

	/** Individual operation by ID */
	OPERATION: (id: string) => `calc:op:${id}`,

	/** Child operations of a parent operation */
	OPERATION_CHILDREN: (parentOpId: string) => `calc:op:${parentOpId}:children`,
} as const;

/**
 * Cache TTL values in seconds
 */
export const CacheTTL = {
	/** Full tree - shorter TTL as it's frequently updated */
	FULL_TREE: 120, // 2 minutes

	/** Root list */
	ROOT_LIST: 300, // 5 minutes

	/** Individual root */
	ROOT: 600, // 10 minutes

	/** Operations under a root */
	ROOT_OPERATIONS: 300, // 5 minutes

	/** Individual operation */
	OPERATION: 600, // 10 minutes

	/** Child operations */
	OPERATION_CHILDREN: 300, // 5 minutes
} as const;
