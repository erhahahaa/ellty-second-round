/**
 * CalculationRoot Entity
 *
 * Represents the starting number of a calculation tree.
 * Analogous to a "post" in social media - it's the root of a discussion.
 */

import type { CalculationOperation } from "./calculation-operation";

export interface CalculationRootProps {
	id: string;
	value: number;
	userId: string;
	username?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateCalculationRootInput {
	value: number;
	userId: string;
	username?: string;
}

export class CalculationRoot {
	readonly id: string;
	readonly value: number;
	readonly userId: string;
	readonly username: string | undefined;
	readonly createdAt: Date;
	readonly updatedAt: Date;

	private _operations: CalculationOperation[] = [];

	private constructor(props: CalculationRootProps) {
		this.id = props.id;
		this.value = props.value;
		this.userId = props.userId;
		this.username = props.username;
		this.createdAt = props.createdAt;
		this.updatedAt = props.updatedAt;
	}

	/**
	 * Get direct operations on this root (first level of tree)
	 */
	get operations(): readonly CalculationOperation[] {
		return this._operations;
	}

	/**
	 * Factory method to create a new CalculationRoot
	 */
	static create(input: CreateCalculationRootInput): CalculationRoot {
		if (!Number.isFinite(input.value)) {
			throw new Error("Value must be a finite number");
		}

		const now = new Date();
		return new CalculationRoot({
			id: crypto.randomUUID(),
			value: input.value,
			userId: input.userId,
			username: input.username,
			createdAt: now,
			updatedAt: now,
		});
	}

	/**
	 * Reconstitute from persistence layer
	 */
	static fromPersistence(props: CalculationRootProps): CalculationRoot {
		return new CalculationRoot(props);
	}

	/**
	 * Add an operation to this root (for building tree in memory)
	 */
	addOperation(operation: CalculationOperation): void {
		this._operations.push(operation);
	}

	/**
	 * Set operations (for bulk assignment during tree building)
	 */
	setOperations(operations: CalculationOperation[]): void {
		this._operations = operations;
	}

	/**
	 * Get the total number of operations in the entire tree (recursive)
	 */
	getTotalOperationCount(): number {
		const countRecursive = (ops: readonly CalculationOperation[]): number => {
			return ops.reduce((sum, op) => sum + 1 + countRecursive(op.children), 0);
		};
		return countRecursive(this._operations);
	}

	/**
	 * Convert to plain object for serialization
	 */
	toJSON(): CalculationRootProps & {
		operations: ReturnType<CalculationOperation["toJSON"]>[];
	} {
		return {
			id: this.id,
			value: this.value,
			userId: this.userId,
			username: this.username,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
			operations: this._operations.map((op) => op.toJSON()),
		};
	}
}
