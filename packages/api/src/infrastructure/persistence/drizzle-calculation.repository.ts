/**
 * Drizzle Calculation Repository Implementation
 *
 * Implements ICalculationRepository using Drizzle ORM.
 * Supports PostgreSQL, SQLite, and other Drizzle-compatible databases.
 */

import type { Database, Transaction } from "@ellty-second-round/db";
import {
	calculationOperation,
	calculationRoot,
	user,
} from "@ellty-second-round/db/schema";
import { desc, eq } from "drizzle-orm";

import {
	CalculationOperation,
	CalculationRoot,
	type ICalculationRepository,
} from "../../domain";

type DbClient = Database | Transaction;

export class DrizzleCalculationRepository implements ICalculationRepository {
	constructor(private readonly dbClient: DbClient) {}

	// ==========================================
	// Query Methods
	// ==========================================

	async findAllRootsWithOperations(): Promise<CalculationRoot[]> {
		// Fetch all roots with user info
		const rootRows = await this.dbClient
			.select({
				id: calculationRoot.id,
				value: calculationRoot.value,
				userId: calculationRoot.userId,
				username: user.username,
				createdAt: calculationRoot.createdAt,
				updatedAt: calculationRoot.updatedAt,
			})
			.from(calculationRoot)
			.leftJoin(user, eq(calculationRoot.userId, user.id))
			.orderBy(desc(calculationRoot.createdAt));

		// Fetch all operations
		const operationRows = await this.dbClient
			.select({
				id: calculationOperation.id,
				parentRootId: calculationOperation.parentRootId,
				parentOperationId: calculationOperation.parentOperationId,
				operator: calculationOperation.operator,
				operand: calculationOperation.operand,
				result: calculationOperation.result,
				userId: calculationOperation.userId,
				username: user.username,
				createdAt: calculationOperation.createdAt,
				updatedAt: calculationOperation.updatedAt,
			})
			.from(calculationOperation)
			.leftJoin(user, eq(calculationOperation.userId, user.id))
			.orderBy(calculationOperation.createdAt);

		// Build tree structure
		return this.buildTrees(rootRows, operationRows);
	}

	async findRootById(id: string): Promise<CalculationRoot | null> {
		const rows = await this.dbClient
			.select({
				id: calculationRoot.id,
				value: calculationRoot.value,
				userId: calculationRoot.userId,
				username: user.username,
				createdAt: calculationRoot.createdAt,
				updatedAt: calculationRoot.updatedAt,
			})
			.from(calculationRoot)
			.leftJoin(user, eq(calculationRoot.userId, user.id))
			.where(eq(calculationRoot.id, id))
			.limit(1);

		if (rows.length === 0) {
			return null;
		}

		const row = rows[0];
		if (!row) {
			return null;
		}

		return this.mapToRootEntity(row);
	}

	async findRootByIdWithOperations(
		id: string,
	): Promise<CalculationRoot | null> {
		const root = await this.findRootById(id);
		if (!root) {
			return null;
		}

		// Fetch all operations for this root (recursively)
		const operationRows = await this.dbClient
			.select({
				id: calculationOperation.id,
				parentRootId: calculationOperation.parentRootId,
				parentOperationId: calculationOperation.parentOperationId,
				operator: calculationOperation.operator,
				operand: calculationOperation.operand,
				result: calculationOperation.result,
				userId: calculationOperation.userId,
				username: user.username,
				createdAt: calculationOperation.createdAt,
				updatedAt: calculationOperation.updatedAt,
			})
			.from(calculationOperation)
			.leftJoin(user, eq(calculationOperation.userId, user.id))
			.orderBy(calculationOperation.createdAt);

		// Filter to only operations in this root's tree
		const relevantOps = this.filterOperationsForRoot(id, operationRows);

		// Build operations tree
		const directOps = this.buildOperationTree(
			relevantOps.filter((op) => op.parentRootId === id),
			relevantOps,
		);

		root.setOperations(directOps);
		return root;
	}

	async findOperationById(id: string): Promise<CalculationOperation | null> {
		const rows = await this.dbClient
			.select({
				id: calculationOperation.id,
				parentRootId: calculationOperation.parentRootId,
				parentOperationId: calculationOperation.parentOperationId,
				operator: calculationOperation.operator,
				operand: calculationOperation.operand,
				result: calculationOperation.result,
				userId: calculationOperation.userId,
				username: user.username,
				createdAt: calculationOperation.createdAt,
				updatedAt: calculationOperation.updatedAt,
			})
			.from(calculationOperation)
			.leftJoin(user, eq(calculationOperation.userId, user.id))
			.where(eq(calculationOperation.id, id))
			.limit(1);

		if (rows.length === 0) {
			return null;
		}

		const row = rows[0];
		if (!row) {
			return null;
		}

		return this.mapToOperationEntity(row);
	}

	async findOperationsByRootId(
		rootId: string,
	): Promise<CalculationOperation[]> {
		const rows = await this.dbClient
			.select({
				id: calculationOperation.id,
				parentRootId: calculationOperation.parentRootId,
				parentOperationId: calculationOperation.parentOperationId,
				operator: calculationOperation.operator,
				operand: calculationOperation.operand,
				result: calculationOperation.result,
				userId: calculationOperation.userId,
				username: user.username,
				createdAt: calculationOperation.createdAt,
				updatedAt: calculationOperation.updatedAt,
			})
			.from(calculationOperation)
			.leftJoin(user, eq(calculationOperation.userId, user.id))
			.where(eq(calculationOperation.parentRootId, rootId))
			.orderBy(calculationOperation.createdAt);

		return rows.map((row) => this.mapToOperationEntity(row));
	}

	async findChildOperations(
		parentOperationId: string,
	): Promise<CalculationOperation[]> {
		const rows = await this.dbClient
			.select({
				id: calculationOperation.id,
				parentRootId: calculationOperation.parentRootId,
				parentOperationId: calculationOperation.parentOperationId,
				operator: calculationOperation.operator,
				operand: calculationOperation.operand,
				result: calculationOperation.result,
				userId: calculationOperation.userId,
				username: user.username,
				createdAt: calculationOperation.createdAt,
				updatedAt: calculationOperation.updatedAt,
			})
			.from(calculationOperation)
			.leftJoin(user, eq(calculationOperation.userId, user.id))
			.where(eq(calculationOperation.parentOperationId, parentOperationId))
			.orderBy(calculationOperation.createdAt);

		return rows.map((row) => this.mapToOperationEntity(row));
	}

	// ==========================================
	// Command Methods
	// ==========================================

	async saveRoot(root: CalculationRoot): Promise<void> {
		await this.dbClient.insert(calculationRoot).values({
			id: root.id,
			value: root.value.toString(),
			userId: root.userId,
			createdAt: root.createdAt,
			updatedAt: root.updatedAt,
		});
	}

	async saveOperation(operation: CalculationOperation): Promise<void> {
		await this.dbClient.insert(calculationOperation).values({
			id: operation.id,
			parentRootId: operation.parentRootId,
			parentOperationId: operation.parentOperationId,
			operator: operation.operator.toString(),
			operand: operation.operand.toString(),
			result: operation.result.toString(),
			userId: operation.userId,
			createdAt: operation.createdAt,
			updatedAt: operation.updatedAt,
		});
	}

	async deleteRoot(id: string): Promise<void> {
		await this.dbClient
			.delete(calculationRoot)
			.where(eq(calculationRoot.id, id));
	}

	async deleteOperation(id: string): Promise<void> {
		await this.dbClient
			.delete(calculationOperation)
			.where(eq(calculationOperation.id, id));
	}

	// ==========================================
	// Private Helper Methods
	// ==========================================

	private buildTrees(
		rootRows: RootRow[],
		operationRows: OperationRow[],
	): CalculationRoot[] {
		// Create map for quick lookup
		const operationsByRootId = new Map<string, OperationRow[]>();
		const operationsByParentOpId = new Map<string, OperationRow[]>();

		for (const op of operationRows) {
			if (op.parentRootId) {
				const existing = operationsByRootId.get(op.parentRootId) || [];
				existing.push(op);
				operationsByRootId.set(op.parentRootId, existing);
			}
			if (op.parentOperationId) {
				const existing = operationsByParentOpId.get(op.parentOperationId) || [];
				existing.push(op);
				operationsByParentOpId.set(op.parentOperationId, existing);
			}
		}

		return rootRows.map((rootRow) => {
			const root = this.mapToRootEntity(rootRow);

			// Get direct operations for this root
			const directOps = operationsByRootId.get(root.id) || [];
			const operations = this.buildOperationTree(directOps, operationRows);

			root.setOperations(operations);
			return root;
		});
	}

	private buildOperationTree(
		directOps: OperationRow[],
		allOps: OperationRow[],
	): CalculationOperation[] {
		const opsMap = new Map<string, OperationRow[]>();

		for (const op of allOps) {
			if (op.parentOperationId) {
				const existing = opsMap.get(op.parentOperationId) || [];
				existing.push(op);
				opsMap.set(op.parentOperationId, existing);
			}
		}

		const buildChildren = (parentId: string): CalculationOperation[] => {
			const children = opsMap.get(parentId) || [];
			return children.map((child) => {
				const entity = this.mapToOperationEntity(child);
				entity.setChildren(buildChildren(child.id));
				return entity;
			});
		};

		return directOps.map((op) => {
			const entity = this.mapToOperationEntity(op);
			entity.setChildren(buildChildren(op.id));
			return entity;
		});
	}

	private filterOperationsForRoot(
		rootId: string,
		allOps: OperationRow[],
	): OperationRow[] {
		// Build set of all operation IDs that belong to this root
		const belongsToRoot = new Set<string>();

		// First pass: add direct children of root
		for (const op of allOps) {
			if (op.parentRootId === rootId) {
				belongsToRoot.add(op.id);
			}
		}

		// Multiple passes to find nested children
		let foundNew = true;
		while (foundNew) {
			foundNew = false;
			for (const op of allOps) {
				if (op.parentOperationId && belongsToRoot.has(op.parentOperationId)) {
					if (!belongsToRoot.has(op.id)) {
						belongsToRoot.add(op.id);
						foundNew = true;
					}
				}
			}
		}

		return allOps.filter((op) => belongsToRoot.has(op.id));
	}

	private mapToRootEntity(row: RootRow): CalculationRoot {
		return CalculationRoot.fromPersistence({
			id: row.id,
			value: Number.parseFloat(row.value),
			userId: row.userId,
			username: row.username ?? undefined,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	}

	private mapToOperationEntity(row: OperationRow): CalculationOperation {
		return CalculationOperation.fromPersistence({
			id: row.id,
			parentRootId: row.parentRootId,
			parentOperationId: row.parentOperationId,
			operator: row.operator,
			operand: Number.parseFloat(row.operand),
			result: Number.parseFloat(row.result),
			userId: row.userId,
			username: row.username ?? undefined,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	}
}

// Type definitions for query results
interface RootRow {
	id: string;
	value: string;
	userId: string;
	username: string | null;
	createdAt: Date;
	updatedAt: Date;
}

interface OperationRow {
	id: string;
	parentRootId: string | null;
	parentOperationId: string | null;
	operator: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE";
	operand: string;
	result: string;
	userId: string;
	username: string | null;
	createdAt: Date;
	updatedAt: Date;
}
