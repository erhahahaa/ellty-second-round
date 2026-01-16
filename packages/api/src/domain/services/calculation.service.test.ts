import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CalculationOperation } from "../entities/calculation-operation";
import { CalculationRoot } from "../entities/calculation-root";
import type { ICacheRepository } from "../repositories/cache.repository.interface";
import {
	CacheKeys,
	CacheTTL,
} from "../repositories/cache.repository.interface";
import type {
	ICalculationRepository,
	IUnitOfWork,
} from "../repositories/calculation.repository.interface";
import { CalculationService } from "./calculation.service";

// Store original crypto.randomUUID
const originalRandomUUID = crypto.randomUUID.bind(crypto);

// UUID counter for predictable IDs
let uuidCounter = 0;
const uuidSequence = ["root-uuid-1", "op-uuid-1", "op-uuid-2", "generic-uuid"];

/**
 * Simple mock function creator compatible with both Vitest and Bun
 */
interface MockFn<T = unknown> {
	(...args: unknown[]): T;
	mock: { calls: unknown[][] };
	mockImplementation: (impl: (...args: unknown[]) => T) => void;
	mockClear: () => void;
}

function createMockFn<T = unknown>(
	defaultImpl?: (...args: unknown[]) => T,
): MockFn<T> {
	let implementation = defaultImpl;
	const calls: unknown[][] = [];

	const fn = ((...args: unknown[]) => {
		calls.push(args);
		return implementation?.(...args);
	}) as MockFn<T>;

	fn.mock = { calls };
	fn.mockImplementation = (impl: (...args: unknown[]) => T) => {
		implementation = impl;
	};
	fn.mockClear = () => {
		calls.length = 0;
	};

	return fn;
}

type MockedRepository = ICalculationRepository & {
	_mocks: {
		findAllRootsWithOperations: MockFn;
		findRootById: MockFn;
		findRootByIdWithOperations: MockFn;
		findOperationById: MockFn;
		findOperationsByRootId: MockFn;
		findChildOperations: MockFn;
		saveRoot: MockFn;
		saveOperation: MockFn;
		deleteRoot: MockFn;
		deleteOperation: MockFn;
	};
};

type MockedCache = ICacheRepository & {
	_mocks: {
		get: MockFn;
		set: MockFn;
		delete: MockFn;
		deleteMany: MockFn;
		invalidateByPrefix: MockFn;
	};
};

type MockedUnitOfWork = IUnitOfWork & {
	_mocks: {
		transaction: MockFn;
	};
};

/**
 * Mock implementations for testing
 */
function createMockRepository(): MockedRepository {
	const mocks = {
		findAllRootsWithOperations: createMockFn(() => Promise.resolve([])),
		findRootById: createMockFn(() => Promise.resolve(null)),
		findRootByIdWithOperations: createMockFn(() => Promise.resolve(null)),
		findOperationById: createMockFn(() => Promise.resolve(null)),
		findOperationsByRootId: createMockFn(() => Promise.resolve([])),
		findChildOperations: createMockFn(() => Promise.resolve([])),
		saveRoot: createMockFn(() => Promise.resolve(undefined)),
		saveOperation: createMockFn(() => Promise.resolve(undefined)),
		deleteRoot: createMockFn(() => Promise.resolve(undefined)),
		deleteOperation: createMockFn(() => Promise.resolve(undefined)),
	};

	return {
		...mocks,
		_mocks: mocks,
	} as MockedRepository;
}

function createMockCache(): MockedCache {
	const mocks = {
		get: createMockFn(() => Promise.resolve(null)),
		set: createMockFn(() => Promise.resolve(undefined)),
		delete: createMockFn(() => Promise.resolve(undefined)),
		deleteMany: createMockFn(() => Promise.resolve(undefined)),
		invalidateByPrefix: createMockFn(() => Promise.resolve(undefined)),
	};

	return {
		...mocks,
		_mocks: mocks,
	} as MockedCache;
}

function createMockUnitOfWork(repo: ICalculationRepository): MockedUnitOfWork {
	const transactionMock = createMockFn(async (...args: unknown[]) => {
		const fn = args[0] as (uow: IUnitOfWork) => Promise<unknown>;
		const uow: IUnitOfWork = {
			calculationRepository: repo,
			transaction: transactionMock as unknown as IUnitOfWork["transaction"],
		};
		return fn(uow);
	});

	return {
		calculationRepository: repo,
		transaction: transactionMock as unknown as IUnitOfWork["transaction"],
		_mocks: { transaction: transactionMock as MockFn },
	};
}

describe("CalculationService", () => {
	let service: CalculationService;
	let mockRepo: MockedRepository;
	let mockCache: MockedCache;
	let mockUow: MockedUnitOfWork;

	beforeEach(() => {
		// Reset UUID counter and mock crypto.randomUUID
		uuidCounter = 0;
		crypto.randomUUID = () => {
			const uuid = uuidSequence[uuidCounter] || "generic-uuid";
			uuidCounter++;
			return uuid as `${string}-${string}-${string}-${string}-${string}`;
		};

		mockRepo = createMockRepository();
		mockCache = createMockCache();
		mockUow = createMockUnitOfWork(mockRepo);
		service = new CalculationService(mockUow, mockCache);
	});

	afterEach(() => {
		crypto.randomUUID = originalRandomUUID;
	});

	describe("getFullTree", () => {
		it("should return cached data if available", async () => {
			const cachedData = [
				{
					id: "root-1",
					value: 100,
					userId: "user-1",
					username: "testuser",
					createdAt: new Date("2024-01-01"),
					updatedAt: new Date("2024-01-01"),
					operations: [],
				},
			];

			mockCache._mocks.get.mockImplementation(() =>
				Promise.resolve(cachedData),
			);

			const result = await service.getFullTree();

			expect(mockCache._mocks.get.mock.calls.length).toBeGreaterThan(0);
			expect(mockCache._mocks.get.mock.calls[0]![0]).toBe(CacheKeys.FULL_TREE);
			expect(mockRepo._mocks.findAllRootsWithOperations.mock.calls.length).toBe(
				0,
			);
			expect(result).toHaveLength(1);
			expect(result[0]!.id).toBe("root-1");
		});

		it("should fetch from repository on cache miss", async () => {
			const roots = [
				CalculationRoot.fromPersistence({
					id: "root-1",
					value: 100,
					userId: "user-1",
					createdAt: new Date(),
					updatedAt: new Date(),
				}),
			];

			mockCache._mocks.get.mockImplementation(() => Promise.resolve(null));
			mockRepo._mocks.findAllRootsWithOperations.mockImplementation(() =>
				Promise.resolve(roots),
			);

			const result = await service.getFullTree();

			expect(mockCache._mocks.get.mock.calls[0]![0]).toBe(CacheKeys.FULL_TREE);
			expect(mockRepo._mocks.findAllRootsWithOperations.mock.calls.length).toBe(
				1,
			);
			expect(result).toEqual(roots);
		});

		it("should cache results after fetching from repository", async () => {
			const roots = [
				CalculationRoot.fromPersistence({
					id: "root-1",
					value: 100,
					userId: "user-1",
					createdAt: new Date(),
					updatedAt: new Date(),
				}),
			];

			mockCache._mocks.get.mockImplementation(() => Promise.resolve(null));
			mockRepo._mocks.findAllRootsWithOperations.mockImplementation(() =>
				Promise.resolve(roots),
			);

			await service.getFullTree();

			// Wait for async cache operation
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(mockCache._mocks.set.mock.calls.length).toBeGreaterThan(0);
			const setCall = mockCache._mocks.set.mock.calls[0]!;
			expect(setCall[0]).toBe(CacheKeys.FULL_TREE);
			expect(setCall[2]).toBe(CacheTTL.FULL_TREE);
		});

		it("should reconstitute entities from cached data", async () => {
			const cachedData = [
				{
					id: "root-1",
					value: 42,
					userId: "user-1",
					username: "testuser",
					createdAt: "2024-01-01T00:00:00.000Z",
					updatedAt: "2024-01-01T00:00:00.000Z",
					operations: [
						{
							id: "op-1",
							parentRootId: "root-1",
							parentOperationId: null,
							operator: "ADD",
							operand: 8,
							result: 50,
							userId: "user-1",
							username: "testuser",
							createdAt: "2024-01-01T00:00:00.000Z",
							updatedAt: "2024-01-01T00:00:00.000Z",
							children: [],
						},
					],
				},
			];

			mockCache._mocks.get.mockImplementation(() =>
				Promise.resolve(cachedData),
			);

			const result = await service.getFullTree();

			expect(result).toHaveLength(1);
			expect(result[0]).toBeInstanceOf(CalculationRoot);
			expect(result[0]!.operations).toHaveLength(1);
		});
	});

	describe("getRootById", () => {
		it("should return cached root if available", async () => {
			const cachedData = {
				id: "root-1",
				value: 100,
				userId: "user-1",
				createdAt: new Date(),
				updatedAt: new Date(),
				operations: [],
			};

			mockCache._mocks.get.mockImplementation(() =>
				Promise.resolve(cachedData),
			);

			const result = await service.getRootById("root-1");

			expect(mockCache._mocks.get.mock.calls[0]![0]).toBe(
				CacheKeys.ROOT("root-1"),
			);
			expect(mockRepo._mocks.findRootByIdWithOperations.mock.calls.length).toBe(
				0,
			);
			expect(result?.id).toBe("root-1");
		});

		it("should fetch from repository on cache miss", async () => {
			const root = CalculationRoot.fromPersistence({
				id: "root-1",
				value: 100,
				userId: "user-1",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			mockCache._mocks.get.mockImplementation(() => Promise.resolve(null));
			mockRepo._mocks.findRootByIdWithOperations.mockImplementation(() =>
				Promise.resolve(root),
			);

			const result = await service.getRootById("root-1");

			expect(mockRepo._mocks.findRootByIdWithOperations.mock.calls[0]![0]).toBe(
				"root-1",
			);
			expect(result).toBe(root);
		});

		it("should return null when root not found", async () => {
			mockCache._mocks.get.mockImplementation(() => Promise.resolve(null));
			mockRepo._mocks.findRootByIdWithOperations.mockImplementation(() =>
				Promise.resolve(null),
			);

			const result = await service.getRootById("non-existent");

			expect(result).toBeNull();
		});

		it("should cache fetched root", async () => {
			const root = CalculationRoot.fromPersistence({
				id: "root-1",
				value: 100,
				userId: "user-1",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			mockCache._mocks.get.mockImplementation(() => Promise.resolve(null));
			mockRepo._mocks.findRootByIdWithOperations.mockImplementation(() =>
				Promise.resolve(root),
			);

			await service.getRootById("root-1");

			// Wait for async cache operation
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(mockCache._mocks.set.mock.calls.length).toBeGreaterThan(0);
			const setCall = mockCache._mocks.set.mock.calls[0]!;
			expect(setCall[0]).toBe(CacheKeys.ROOT("root-1"));
			expect(setCall[2]).toBe(CacheTTL.ROOT);
		});
	});

	describe("createRoot", () => {
		it("should create and persist a new root", async () => {
			const result = await service.createRoot({
				value: 100,
				userId: "user-123",
				username: "testuser",
			});

			expect(mockUow._mocks.transaction.mock.calls.length).toBe(1);
			expect(mockRepo._mocks.saveRoot.mock.calls.length).toBe(1);
			expect(result.value).toBe(100);
			expect(result.userId).toBe("user-123");
			expect(result.username).toBe("testuser");
		});

		it("should invalidate cache before transaction", async () => {
			await service.createRoot({
				value: 100,
				userId: "user-123",
			});

			expect(mockCache._mocks.deleteMany.mock.calls.length).toBeGreaterThan(0);
			const deleteCall = mockCache._mocks.deleteMany.mock
				.calls[0]![0] as string[];
			expect(deleteCall).toContain(CacheKeys.ROOT_LIST);
			expect(deleteCall).toContain(CacheKeys.FULL_TREE);
		});

		it("should update cache after successful creation", async () => {
			await service.createRoot({
				value: 100,
				userId: "user-123",
			});

			// Wait for async cache operations
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(mockCache._mocks.set.mock.calls.length).toBeGreaterThan(0);
			expect(mockCache._mocks.delete.mock.calls.length).toBeGreaterThan(0);
			expect(mockCache._mocks.delete.mock.calls[0]![0]).toBe(
				CacheKeys.FULL_TREE,
			);
		});

		it("should invalidate cache on error", async () => {
			mockRepo._mocks.saveRoot.mockImplementation(() =>
				Promise.reject(new Error("DB Error")),
			);

			await expect(
				service.createRoot({
					value: 100,
					userId: "user-123",
				}),
			).rejects.toThrow("DB Error");

			// Cache should be invalidated even on error
			expect(mockCache._mocks.deleteMany.mock.calls.length).toBeGreaterThan(0);
		});

		it("should validate input through entity", async () => {
			await expect(
				service.createRoot({
					value: Number.POSITIVE_INFINITY,
					userId: "user-123",
				}),
			).rejects.toThrow("Value must be a finite number");
		});
	});

	describe("createOperation", () => {
		beforeEach(() => {
			// Set up a root for operations to reference
			const root = CalculationRoot.fromPersistence({
				id: "root-123",
				value: 100,
				userId: "user-123",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			mockRepo._mocks.findRootById.mockImplementation(() =>
				Promise.resolve(root),
			);
		});

		it("should create operation with root parent", async () => {
			const result = await service.createOperation({
				parentRootId: "root-123",
				operator: "ADD",
				operand: 50,
				userId: "user-123",
				username: "testuser",
			});

			expect(mockUow._mocks.transaction.mock.calls.length).toBeGreaterThan(0);
			expect(mockRepo._mocks.saveOperation.mock.calls.length).toBe(1);
			expect(result.parentRootId).toBe("root-123");
			expect(result.parentOperationId).toBeNull();
			expect(result.result).toBe(150); // 100 + 50
		});

		it("should create operation with operation parent", async () => {
			const parentOp = CalculationOperation.fromPersistence({
				id: "parent-op-123",
				parentRootId: "root-123",
				parentOperationId: null,
				operator: "ADD",
				operand: 50,
				result: 150,
				userId: "user-123",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			mockRepo._mocks.findOperationById.mockImplementation(() =>
				Promise.resolve(parentOp),
			);

			const result = await service.createOperation({
				parentOperationId: "parent-op-123",
				operator: "MULTIPLY",
				operand: 2,
				userId: "user-123",
			});

			expect(result.parentOperationId).toBe("parent-op-123");
			expect(result.result).toBe(300); // 150 * 2
		});

		it("should throw error when no parent provided", async () => {
			await expect(
				service.createOperation({
					operator: "ADD",
					operand: 50,
					userId: "user-123",
				}),
			).rejects.toThrow("Operation must have a parent (root or operation)");
		});

		it("should throw error when both parents provided", async () => {
			await expect(
				service.createOperation({
					parentRootId: "root-123",
					parentOperationId: "op-123",
					operator: "ADD",
					operand: 50,
					userId: "user-123",
				}),
			).rejects.toThrow("Operation cannot have both root and operation parent");
		});

		it("should throw error when parent root not found", async () => {
			mockRepo._mocks.findRootById.mockImplementation(() =>
				Promise.resolve(null),
			);

			await expect(
				service.createOperation({
					parentRootId: "non-existent-root",
					operator: "ADD",
					operand: 50,
					userId: "user-123",
				}),
			).rejects.toThrow("Parent root not found: non-existent-root");
		});

		it("should throw error when parent operation not found", async () => {
			mockRepo._mocks.findOperationById.mockImplementation(() =>
				Promise.resolve(null),
			);

			await expect(
				service.createOperation({
					parentOperationId: "non-existent-op",
					operator: "ADD",
					operand: 50,
					userId: "user-123",
				}),
			).rejects.toThrow("Parent operation not found: non-existent-op");
		});

		it("should throw error for division by zero", async () => {
			await expect(
				service.createOperation({
					parentRootId: "root-123",
					operator: "DIVIDE",
					operand: 0,
					userId: "user-123",
				}),
			).rejects.toThrow("Invalid operation: division by zero");
		});

		it("should invalidate appropriate cache keys for root parent", async () => {
			await service.createOperation({
				parentRootId: "root-123",
				operator: "ADD",
				operand: 50,
				userId: "user-123",
			});

			const deleteCall = mockCache._mocks.deleteMany.mock
				.calls[0]![0] as string[];
			expect(deleteCall).toContain(CacheKeys.FULL_TREE);
			expect(deleteCall).toContain(CacheKeys.ROOT("root-123"));
			expect(deleteCall).toContain(CacheKeys.ROOT_OPERATIONS("root-123"));
		});

		it("should invalidate appropriate cache keys for operation parent", async () => {
			const parentOp = CalculationOperation.fromPersistence({
				id: "parent-op-123",
				parentRootId: "root-123",
				parentOperationId: null,
				operator: "ADD",
				operand: 50,
				result: 150,
				userId: "user-123",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			mockRepo._mocks.findOperationById.mockImplementation(() =>
				Promise.resolve(parentOp),
			);

			await service.createOperation({
				parentOperationId: "parent-op-123",
				operator: "MULTIPLY",
				operand: 2,
				userId: "user-123",
			});

			const deleteCall = mockCache._mocks.deleteMany.mock
				.calls[0]![0] as string[];
			expect(deleteCall).toContain(CacheKeys.FULL_TREE);
			expect(deleteCall).toContain(CacheKeys.OPERATION("parent-op-123"));
			expect(deleteCall).toContain(
				CacheKeys.OPERATION_CHILDREN("parent-op-123"),
			);
		});

		describe("operator calculations", () => {
			it("should calculate ADD correctly", async () => {
				const result = await service.createOperation({
					parentRootId: "root-123",
					operator: "ADD",
					operand: 25,
					userId: "user-123",
				});

				expect(result.result).toBe(125); // 100 + 25
			});

			it("should calculate SUBTRACT correctly", async () => {
				const result = await service.createOperation({
					parentRootId: "root-123",
					operator: "SUBTRACT",
					operand: 30,
					userId: "user-123",
				});

				expect(result.result).toBe(70); // 100 - 30
			});

			it("should calculate MULTIPLY correctly", async () => {
				const result = await service.createOperation({
					parentRootId: "root-123",
					operator: "MULTIPLY",
					operand: 3,
					userId: "user-123",
				});

				expect(result.result).toBe(300); // 100 * 3
			});

			it("should calculate DIVIDE correctly", async () => {
				const result = await service.createOperation({
					parentRootId: "root-123",
					operator: "DIVIDE",
					operand: 4,
					userId: "user-123",
				});

				expect(result.result).toBe(25); // 100 / 4
			});
		});
	});

	describe("transaction handling", () => {
		it("should run operations within transaction", async () => {
			await service.createRoot({
				value: 100,
				userId: "user-123",
			});

			expect(mockUow._mocks.transaction.mock.calls.length).toBe(1);
		});

		it("should rollback on repository error", async () => {
			const error = new Error("Database constraint violation");
			mockRepo._mocks.saveRoot.mockImplementation(() => Promise.reject(error));

			await expect(
				service.createRoot({
					value: 100,
					userId: "user-123",
				}),
			).rejects.toThrow("Database constraint violation");
		});
	});

	describe("cache-aside pattern", () => {
		it("should follow cache-aside read pattern", async () => {
			// First call - cache miss
			let cacheGetCalled = false;
			let repoFindCalled = false;

			mockCache._mocks.get.mockImplementation(() => {
				cacheGetCalled = true;
				expect(repoFindCalled).toBe(false); // Cache should be checked first
				return Promise.resolve(null);
			});

			const roots = [
				CalculationRoot.fromPersistence({
					id: "root-1",
					value: 100,
					userId: "user-1",
					createdAt: new Date(),
					updatedAt: new Date(),
				}),
			];
			mockRepo._mocks.findAllRootsWithOperations.mockImplementation(() => {
				repoFindCalled = true;
				return Promise.resolve(roots);
			});

			await service.getFullTree();

			// Verify both were called
			expect(cacheGetCalled).toBe(true);
			expect(repoFindCalled).toBe(true);

			// Wait for async cache
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Verify result was cached
			expect(mockCache._mocks.set.mock.calls.length).toBeGreaterThan(0);
		});

		it("should invalidate related caches on write", async () => {
			await service.createRoot({
				value: 100,
				userId: "user-123",
			});

			// Should invalidate list and full tree caches
			const deleteCall = mockCache._mocks.deleteMany.mock
				.calls[0]![0] as string[];
			expect(deleteCall).toContain(CacheKeys.ROOT_LIST);
			expect(deleteCall).toContain(CacheKeys.FULL_TREE);
		});
	});
});
