/**
 * Calculation Service
 *
 * Application service that orchestrates business logic for calculations.
 * Uses Unit of Work pattern for ACID transactions.
 * Uses Cache-Aside pattern with invalidation for caching.
 */

import { CalculationOperation } from "../entities/calculation-operation";
import { CalculationRoot } from "../entities/calculation-root";
import {
	CacheKeys,
	CacheTTL,
	type ICacheRepository,
} from "../repositories/cache.repository.interface";
import type { IUnitOfWork } from "../repositories/calculation.repository.interface";
import { Operator, type OperatorType } from "../value-objects/operator";

// ==========================================
// Input DTOs
// ==========================================

export interface CreateRootInput {
	value: number;
	userId: string;
	username?: string;
}

export interface CreateOperationInput {
	parentRootId?: string;
	parentOperationId?: string;
	operator: OperatorType;
	operand: number;
	userId: string;
	username?: string;
}

// ==========================================
// Service Implementation
// ==========================================

export class CalculationService {
	constructor(
		private readonly unitOfWork: IUnitOfWork,
		private readonly cache: ICacheRepository,
	) {}

	// ==========================================
	// Query Methods (with caching)
	// ==========================================

	/**
	 * Get the full calculation tree
	 * Uses cache-aside pattern: check cache first, then DB, then cache result
	 */
	async getFullTree(): Promise<CalculationRoot[]> {
		// 1. Try cache first
		const cached = await this.cache.get<
			ReturnType<CalculationRoot["toJSON"]>[]
		>(CacheKeys.FULL_TREE);

		if (cached) {
			// Reconstitute entities from cached data
			return this.reconstituteTrees(cached);
		}

		// 2. Cache miss - fetch from DB
		const trees =
			await this.unitOfWork.calculationRepository.findAllRootsWithOperations();

		// 3. Cache the result (fire-and-forget)
		this.cacheTreesAsync(trees);

		return trees;
	}

	/**
	 * Get a single root by ID with its operation tree
	 */
	async getRootById(id: string): Promise<CalculationRoot | null> {
		// Try cache first
		const cached = await this.cache.get<ReturnType<CalculationRoot["toJSON"]>>(
			CacheKeys.ROOT(id),
		);

		if (cached) {
			return this.reconstituteTree(cached);
		}

		// Fetch from DB
		const root =
			await this.unitOfWork.calculationRepository.findRootByIdWithOperations(
				id,
			);

		if (root) {
			// Cache it
			this.cache
				.set(CacheKeys.ROOT(id), root.toJSON(), CacheTTL.ROOT)
				.catch(() => {});
		}

		return root;
	}

	// ==========================================
	// Command Methods (with transactions)
	// ==========================================

	/**
	 * Create a new calculation root (starting number)
	 * Runs in a transaction with cache invalidation
	 */
	async createRoot(input: CreateRootInput): Promise<CalculationRoot> {
		// Invalidate cache before transaction (optimistic)
		await this.invalidateCacheForNewRoot();

		try {
			// Execute in transaction
			const root = await this.unitOfWork.transaction(async (uow) => {
				// Create entity
				const newRoot = CalculationRoot.create({
					value: input.value,
					userId: input.userId,
					username: input.username,
				});

				// Persist
				await uow.calculationRepository.saveRoot(newRoot);

				return newRoot;
			});

			// Update cache after successful transaction
			await this.updateCacheAfterRootCreation(root);

			return root;
		} catch (error) {
			// On failure, invalidate cache to ensure consistency
			await this.invalidateCacheForNewRoot();
			throw error;
		}
	}

	/**
	 * Create a new calculation operation (reply)
	 * Runs in a transaction with cache invalidation
	 */
	async createOperation(
		input: CreateOperationInput,
	): Promise<CalculationOperation> {
		// Validate input
		if (!input.parentRootId && !input.parentOperationId) {
			throw new Error("Operation must have a parent (root or operation)");
		}
		if (input.parentRootId && input.parentOperationId) {
			throw new Error("Operation cannot have both root and operation parent");
		}

		// Invalidate cache before transaction (optimistic)
		await this.invalidateCacheForNewOperation(input);

		try {
			// Execute in transaction
			const operation = await this.unitOfWork.transaction(async (uow) => {
				// Get parent value
				const parentValue = await this.getParentValue(uow, input);

				// Create operator value object
				const operator = Operator.create(input.operator);

				// Create entity (validates and computes result)
				const newOperation = CalculationOperation.create({
					parentRootId: input.parentRootId,
					parentOperationId: input.parentOperationId,
					operator,
					operand: input.operand,
					parentValue,
					userId: input.userId,
					username: input.username,
				});

				// Persist
				await uow.calculationRepository.saveOperation(newOperation);

				return newOperation;
			});

			// Update cache after successful transaction
			await this.updateCacheAfterOperationCreation(operation);

			return operation;
		} catch (error) {
			// On failure, invalidate cache to ensure consistency
			await this.invalidateCacheForNewOperation(input);
			throw error;
		}
	}

	// ==========================================
	// Private Helper Methods
	// ==========================================

	private async getParentValue(
		uow: IUnitOfWork,
		input: CreateOperationInput,
	): Promise<number> {
		if (input.parentRootId) {
			const root = await uow.calculationRepository.findRootById(
				input.parentRootId,
			);
			if (!root) {
				throw new Error(`Parent root not found: ${input.parentRootId}`);
			}
			return root.value;
		}

		if (input.parentOperationId) {
			const operation = await uow.calculationRepository.findOperationById(
				input.parentOperationId,
			);
			if (!operation) {
				throw new Error(
					`Parent operation not found: ${input.parentOperationId}`,
				);
			}
			return operation.result;
		}

		throw new Error("Must specify parent root or operation");
	}

	// ==========================================
	// Cache Management (Private)
	// ==========================================

	private async invalidateCacheForNewRoot(): Promise<void> {
		await this.cache
			.deleteMany([CacheKeys.ROOT_LIST, CacheKeys.FULL_TREE])
			.catch(() => {});
	}

	private async updateCacheAfterRootCreation(
		root: CalculationRoot,
	): Promise<void> {
		await Promise.all([
			this.cache.set(CacheKeys.ROOT(root.id), root.toJSON(), CacheTTL.ROOT),
			this.cache.delete(CacheKeys.FULL_TREE), // Will rebuild on next read
		]).catch(() => {});
	}

	private async invalidateCacheForNewOperation(
		input: CreateOperationInput,
	): Promise<void> {
		const keysToInvalidate: string[] = [CacheKeys.FULL_TREE];

		if (input.parentRootId) {
			keysToInvalidate.push(
				CacheKeys.ROOT(input.parentRootId),
				CacheKeys.ROOT_OPERATIONS(input.parentRootId),
			);
		}

		if (input.parentOperationId) {
			keysToInvalidate.push(
				CacheKeys.OPERATION(input.parentOperationId),
				CacheKeys.OPERATION_CHILDREN(input.parentOperationId),
			);
		}

		await this.cache.deleteMany(keysToInvalidate).catch(() => {});
	}

	private async updateCacheAfterOperationCreation(
		operation: CalculationOperation,
	): Promise<void> {
		await Promise.all([
			this.cache.set(
				CacheKeys.OPERATION(operation.id),
				operation.toJSON(),
				CacheTTL.OPERATION,
			),
			this.cache.delete(CacheKeys.FULL_TREE), // Will rebuild on next read
		]).catch(() => {});
	}

	private cacheTreesAsync(trees: CalculationRoot[]): void {
		this.cache
			.set(
				CacheKeys.FULL_TREE,
				trees.map((t) => t.toJSON()),
				CacheTTL.FULL_TREE,
			)
			.catch(() => {});
	}

	// ==========================================
	// Entity Reconstitution from Cache
	// ==========================================

	private reconstituteTrees(
		data: ReturnType<CalculationRoot["toJSON"]>[],
	): CalculationRoot[] {
		return data.map((d) => this.reconstituteTree(d));
	}

	private reconstituteTree(
		data: ReturnType<CalculationRoot["toJSON"]>,
	): CalculationRoot {
		const root = CalculationRoot.fromPersistence({
			id: data.id,
			value: data.value,
			userId: data.userId,
			username: data.username,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt),
		});

		const operations = data.operations.map((op) =>
			this.reconstituteOperation(op),
		);
		root.setOperations(operations);

		return root;
	}

	private reconstituteOperation(
		data: ReturnType<CalculationOperation["toJSON"]>,
	): CalculationOperation {
		const operation = CalculationOperation.fromPersistence({
			id: data.id,
			parentRootId: data.parentRootId,
			parentOperationId: data.parentOperationId,
			operator: data.operator,
			operand: data.operand,
			result: data.result,
			userId: data.userId,
			username: data.username,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt),
		});

		const children = data.children.map((child) =>
			this.reconstituteOperation(child),
		);
		operation.setChildren(children);

		return operation;
	}
}
