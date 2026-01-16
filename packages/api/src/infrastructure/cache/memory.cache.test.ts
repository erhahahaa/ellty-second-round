import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryCache } from "./memory.cache";

describe("MemoryCache", () => {
	let cache: MemoryCache;

	beforeEach(() => {
		cache = new MemoryCache();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("get and set", () => {
		it("should return null for non-existent key", async () => {
			const result = await cache.get("non-existent");
			expect(result).toBeNull();
		});

		it("should store and retrieve a string value", async () => {
			await cache.set("key1", "value1");
			const result = await cache.get<string>("key1");
			expect(result).toBe("value1");
		});

		it("should store and retrieve a number value", async () => {
			await cache.set("number-key", 42);
			const result = await cache.get<number>("number-key");
			expect(result).toBe(42);
		});

		it("should store and retrieve an object value", async () => {
			const obj = { name: "test", count: 5 };
			await cache.set("object-key", obj);
			const result = await cache.get<typeof obj>("object-key");
			expect(result).toEqual(obj);
		});

		it("should store and retrieve an array value", async () => {
			const arr = [1, 2, 3, 4, 5];
			await cache.set("array-key", arr);
			const result = await cache.get<number[]>("array-key");
			expect(result).toEqual(arr);
		});

		it("should store and retrieve complex nested objects", async () => {
			const complex = {
				user: {
					id: "123",
					profile: {
						name: "Test User",
						settings: {
							theme: "dark",
							notifications: true,
						},
					},
				},
				items: [
					{ id: 1, value: "a" },
					{ id: 2, value: "b" },
				],
			};
			await cache.set("complex-key", complex);
			const result = await cache.get<typeof complex>("complex-key");
			expect(result).toEqual(complex);
		});

		it("should overwrite existing value with same key", async () => {
			await cache.set("key1", "value1");
			await cache.set("key1", "value2");
			const result = await cache.get<string>("key1");
			expect(result).toBe("value2");
		});
	});

	describe("TTL (Time To Live)", () => {
		it("should use default TTL of 300 seconds", async () => {
			await cache.set("ttl-key", "value");

			// Advance time by 299 seconds - should still exist
			vi.advanceTimersByTime(299 * 1000);
			expect(await cache.get("ttl-key")).toBe("value");

			// Advance 2 more seconds (total 301) - should be expired
			vi.advanceTimersByTime(2 * 1000);
			expect(await cache.get("ttl-key")).toBeNull();
		});

		it("should respect custom TTL", async () => {
			await cache.set("short-ttl-key", "value", 10);

			// Advance time by 9 seconds - should still exist
			vi.advanceTimersByTime(9 * 1000);
			expect(await cache.get("short-ttl-key")).toBe("value");

			// Advance 2 more seconds (total 11) - should be expired
			vi.advanceTimersByTime(2 * 1000);
			expect(await cache.get("short-ttl-key")).toBeNull();
		});

		it("should handle very short TTL", async () => {
			await cache.set("very-short-ttl", "value", 1);

			// Should exist immediately
			expect(await cache.get("very-short-ttl")).toBe("value");

			// Advance by 2 seconds - should be expired
			vi.advanceTimersByTime(2 * 1000);
			expect(await cache.get("very-short-ttl")).toBeNull();
		});

		it("should delete expired entry on get", async () => {
			await cache.set("expires", "value", 10);
			expect(cache.size()).toBe(1);

			vi.advanceTimersByTime(11 * 1000);

			// Get should clean up expired entry
			await cache.get("expires");
			expect(cache.size()).toBe(0);
		});

		it("should refresh TTL when overwriting", async () => {
			await cache.set("refresh-key", "value1", 10);

			// Advance 8 seconds
			vi.advanceTimersByTime(8 * 1000);

			// Overwrite with new TTL
			await cache.set("refresh-key", "value2", 10);

			// Advance 5 more seconds (total 13 from start)
			// Original would have expired, but new TTL should keep it alive
			vi.advanceTimersByTime(5 * 1000);
			expect(await cache.get("refresh-key")).toBe("value2");
		});
	});

	describe("delete", () => {
		it("should delete an existing key", async () => {
			await cache.set("to-delete", "value");
			expect(await cache.get("to-delete")).toBe("value");

			await cache.delete("to-delete");
			expect(await cache.get("to-delete")).toBeNull();
		});

		it("should not throw when deleting non-existent key", async () => {
			// Should complete without throwing
			await cache.delete("non-existent");
			// If we get here, it didn't throw
			expect(true).toBe(true);
		});

		it("should only delete the specified key", async () => {
			await cache.set("key1", "value1");
			await cache.set("key2", "value2");

			await cache.delete("key1");

			expect(await cache.get("key1")).toBeNull();
			expect(await cache.get("key2")).toBe("value2");
		});
	});

	describe("deleteMany", () => {
		it("should delete multiple keys", async () => {
			await cache.set("key1", "value1");
			await cache.set("key2", "value2");
			await cache.set("key3", "value3");

			await cache.deleteMany(["key1", "key2"]);

			expect(await cache.get("key1")).toBeNull();
			expect(await cache.get("key2")).toBeNull();
			expect(await cache.get("key3")).toBe("value3");
		});

		it("should handle empty array", async () => {
			await cache.set("key1", "value1");
			await cache.deleteMany([]);
			expect(await cache.get("key1")).toBe("value1");
		});

		it("should handle non-existent keys in array", async () => {
			await cache.set("key1", "value1");
			// Should complete without throwing
			await cache.deleteMany(["non-existent1", "non-existent2"]);
			expect(await cache.get("key1")).toBe("value1");
		});

		it("should handle mixed existing and non-existing keys", async () => {
			await cache.set("exists", "value");
			await cache.deleteMany(["exists", "does-not-exist"]);
			expect(await cache.get("exists")).toBeNull();
		});
	});

	describe("invalidateByPrefix", () => {
		it("should delete all keys with matching prefix", async () => {
			await cache.set("calc:root:1", "root1");
			await cache.set("calc:root:2", "root2");
			await cache.set("calc:op:1", "op1");
			await cache.set("other:key", "other");

			await cache.invalidateByPrefix("calc:root:");

			expect(await cache.get("calc:root:1")).toBeNull();
			expect(await cache.get("calc:root:2")).toBeNull();
			expect(await cache.get("calc:op:1")).toBe("op1");
			expect(await cache.get("other:key")).toBe("other");
		});

		it("should handle empty prefix (delete all)", async () => {
			await cache.set("key1", "value1");
			await cache.set("key2", "value2");

			await cache.invalidateByPrefix("");

			expect(await cache.get("key1")).toBeNull();
			expect(await cache.get("key2")).toBeNull();
		});

		it("should handle no matching keys", async () => {
			await cache.set("key1", "value1");
			// Should complete without throwing
			await cache.invalidateByPrefix("nonexistent:");
			expect(await cache.get("key1")).toBe("value1");
		});

		it("should handle exact key match", async () => {
			await cache.set("exactkey", "value");
			await cache.invalidateByPrefix("exactkey");
			expect(await cache.get("exactkey")).toBeNull();
		});
	});

	describe("clear", () => {
		it("should remove all entries", async () => {
			await cache.set("key1", "value1");
			await cache.set("key2", "value2");
			await cache.set("key3", "value3");

			cache.clear();

			expect(await cache.get("key1")).toBeNull();
			expect(await cache.get("key2")).toBeNull();
			expect(await cache.get("key3")).toBeNull();
			expect(cache.size()).toBe(0);
		});

		it("should work on empty cache", () => {
			expect(() => cache.clear()).not.toThrow();
			expect(cache.size()).toBe(0);
		});
	});

	describe("size", () => {
		it("should return 0 for empty cache", () => {
			expect(cache.size()).toBe(0);
		});

		it("should return correct count of entries", async () => {
			await cache.set("key1", "value1");
			expect(cache.size()).toBe(1);

			await cache.set("key2", "value2");
			expect(cache.size()).toBe(2);

			await cache.set("key3", "value3");
			expect(cache.size()).toBe(3);
		});

		it("should decrease when entries are deleted", async () => {
			await cache.set("key1", "value1");
			await cache.set("key2", "value2");
			expect(cache.size()).toBe(2);

			await cache.delete("key1");
			expect(cache.size()).toBe(1);
		});

		it("should not increase when overwriting existing key", async () => {
			await cache.set("key1", "value1");
			await cache.set("key1", "value2");
			expect(cache.size()).toBe(1);
		});

		it("should not count expired entries (but they remain until accessed)", async () => {
			await cache.set("key1", "value1", 10);
			expect(cache.size()).toBe(1);

			vi.advanceTimersByTime(15 * 1000);
			// Size still shows 1 because expired entries are only cleaned on access
			expect(cache.size()).toBe(1);

			// Access triggers cleanup
			await cache.get("key1");
			expect(cache.size()).toBe(0);
		});
	});

	describe("concurrent operations", () => {
		it("should handle concurrent sets", async () => {
			const promises = [];
			for (let i = 0; i < 100; i++) {
				promises.push(cache.set(`key${i}`, `value${i}`));
			}
			await Promise.all(promises);

			expect(cache.size()).toBe(100);
			expect(await cache.get("key50")).toBe("value50");
		});

		it("should handle concurrent gets", async () => {
			await cache.set("shared-key", "shared-value");

			const promises = [];
			for (let i = 0; i < 100; i++) {
				promises.push(cache.get("shared-key"));
			}
			const results = await Promise.all(promises);

			expect(results.every((r) => r === "shared-value")).toBe(true);
		});

		it("should handle concurrent deletes", async () => {
			for (let i = 0; i < 100; i++) {
				await cache.set(`key${i}`, `value${i}`);
			}

			const deletePromises = [];
			for (let i = 0; i < 50; i++) {
				deletePromises.push(cache.delete(`key${i}`));
			}
			await Promise.all(deletePromises);

			expect(cache.size()).toBe(50);
		});
	});

	describe("ICacheRepository interface compliance", () => {
		it("should have all required methods", () => {
			expect(typeof cache.get).toBe("function");
			expect(typeof cache.set).toBe("function");
			expect(typeof cache.delete).toBe("function");
			expect(typeof cache.deleteMany).toBe("function");
			expect(typeof cache.invalidateByPrefix).toBe("function");
		});

		it("should return Promise from all async methods", () => {
			expect(cache.get("key")).toBeInstanceOf(Promise);
			expect(cache.set("key", "value")).toBeInstanceOf(Promise);
			expect(cache.delete("key")).toBeInstanceOf(Promise);
			expect(cache.deleteMany(["key"])).toBeInstanceOf(Promise);
			expect(cache.invalidateByPrefix("prefix")).toBeInstanceOf(Promise);
		});
	});
});
