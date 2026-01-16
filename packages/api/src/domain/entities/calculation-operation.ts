/**
 * CalculationOperation Entity
 *
 * Represents a mathematical operation applied to a parent (root or another operation).
 * Forms the nodes of the calculation tree below the root.
 */

import { Operator, type OperatorType } from "../value-objects/operator";

export interface CalculationOperationProps {
	id: string;
	parentRootId: string | null;
	parentOperationId: string | null;
	operator: OperatorType;
	operand: number;
	result: number;
	userId: string;
	username?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateCalculationOperationInput {
	parentRootId?: string;
	parentOperationId?: string;
	operator: Operator;
	operand: number;
	parentValue: number;
	userId: string;
	username?: string;
}

export class CalculationOperation {
	readonly id: string;
	readonly parentRootId: string | null;
	readonly parentOperationId: string | null;
	readonly operator: Operator;
	readonly operand: number;
	readonly result: number;
	readonly userId: string;
	readonly username: string | undefined;
	readonly createdAt: Date;
	readonly updatedAt: Date;

	private _children: CalculationOperation[] = [];

	private constructor(props: CalculationOperationProps) {
		this.id = props.id;
		this.parentRootId = props.parentRootId;
		this.parentOperationId = props.parentOperationId;
		this.operator = Operator.fromType(props.operator);
		this.operand = props.operand;
		this.result = props.result;
		this.userId = props.userId;
		this.username = props.username;
		this.createdAt = props.createdAt;
		this.updatedAt = props.updatedAt;
	}

	/**
	 * Get child operations (replies to this operation)
	 */
	get children(): readonly CalculationOperation[] {
		return this._children;
	}

	/**
	 * Factory method to create a new CalculationOperation
	 */
	static create(input: CreateCalculationOperationInput): CalculationOperation {
		// Validate: must have exactly one parent
		if (!input.parentRootId && !input.parentOperationId) {
			throw new Error("Operation must have a parent (root or operation)");
		}
		if (input.parentRootId && input.parentOperationId) {
			throw new Error("Operation cannot have both root and operation parent");
		}

		// Validate: operator must be valid with operand
		if (!input.operator.isValidWith(input.operand)) {
			throw new Error("Invalid operation: division by zero");
		}

		// Calculate result
		const result = input.operator.calculate(input.parentValue, input.operand);

		const now = new Date();
		return new CalculationOperation({
			id: crypto.randomUUID(),
			parentRootId: input.parentRootId ?? null,
			parentOperationId: input.parentOperationId ?? null,
			operator: input.operator.toString(),
			operand: input.operand,
			result,
			userId: input.userId,
			username: input.username,
			createdAt: now,
			updatedAt: now,
		});
	}

	/**
	 * Reconstitute from persistence layer
	 */
	static fromPersistence(
		props: CalculationOperationProps,
	): CalculationOperation {
		return new CalculationOperation(props);
	}

	/**
	 * Add a child operation (for building tree in memory)
	 */
	addChild(child: CalculationOperation): void {
		this._children.push(child);
	}

	/**
	 * Set children (for bulk assignment during tree building)
	 */
	setChildren(children: CalculationOperation[]): void {
		this._children = children;
	}

	/**
	 * Get display string for the operation (e.g., "+ 5 = 47")
	 */
	toDisplayString(): string {
		return `${this.operator.displaySymbol} ${this.operand} = ${this.result}`;
	}

	/**
	 * Convert to plain object for serialization
	 */
	toJSON(): CalculationOperationProps & {
		children: ReturnType<CalculationOperation["toJSON"]>[];
	} {
		return {
			id: this.id,
			parentRootId: this.parentRootId,
			parentOperationId: this.parentOperationId,
			operator: this.operator.toString(),
			operand: this.operand,
			result: this.result,
			userId: this.userId,
			username: this.username,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
			children: this._children.map((c) => c.toJSON()),
		};
	}
}
