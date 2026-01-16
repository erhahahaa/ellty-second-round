/**
 * Operator Value Object
 *
 * Encapsulates the mathematical operation type and its behavior.
 * Immutable - once created, cannot be changed.
 */

export const OPERATORS = ["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"] as const;
export type OperatorType = (typeof OPERATORS)[number];

export class Operator {
	private constructor(private readonly value: OperatorType) {}

	/**
	 * Create an Operator from a string value
	 * @throws Error if the value is not a valid operator
	 */
	static create(value: string): Operator {
		if (!OPERATORS.includes(value as OperatorType)) {
			throw new Error(
				`Invalid operator: ${value}. Must be one of: ${OPERATORS.join(", ")}`,
			);
		}
		return new Operator(value as OperatorType);
	}

	/**
	 * Create an Operator from a known valid type (no validation)
	 */
	static fromType(type: OperatorType): Operator {
		return new Operator(type);
	}

	/**
	 * Get the mathematical symbol for display
	 */
	get symbol(): string {
		const symbols: Record<OperatorType, string> = {
			ADD: "+",
			SUBTRACT: "-",
			MULTIPLY: "*",
			DIVIDE: "/",
		};
		return symbols[this.value];
	}

	/**
	 * Get the display symbol (prettier unicode characters)
	 */
	get displaySymbol(): string {
		const symbols: Record<OperatorType, string> = {
			ADD: "+",
			SUBTRACT: "\u2212", // minus sign
			MULTIPLY: "\u00D7", // multiplication sign
			DIVIDE: "\u00F7", // division sign
		};
		return symbols[this.value];
	}

	/**
	 * Perform the calculation
	 * @throws Error if dividing by zero
	 */
	calculate(left: number, right: number): number {
		switch (this.value) {
			case "ADD":
				return left + right;
			case "SUBTRACT":
				return left - right;
			case "MULTIPLY":
				return left * right;
			case "DIVIDE":
				if (right === 0) {
					throw new Error("Division by zero is not allowed");
				}
				return left / right;
		}
	}

	/**
	 * Check if this operation with the given operand would be valid
	 */
	isValidWith(operand: number): boolean {
		if (this.value === "DIVIDE" && operand === 0) {
			return false;
		}
		return true;
	}

	/**
	 * Get the raw operator type
	 */
	toString(): OperatorType {
		return this.value;
	}

	/**
	 * Check equality with another Operator
	 */
	equals(other: Operator): boolean {
		return this.value === other.value;
	}
}
