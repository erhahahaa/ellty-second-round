import { describe, expect, it } from "vitest";
import { OPERATORS, Operator, type OperatorType } from "./operator";

describe("Operator Value Object", () => {
	describe("create", () => {
		it("should create an ADD operator from string", () => {
			const operator = Operator.create("ADD");
			expect(operator.toString()).toBe("ADD");
		});

		it("should create a SUBTRACT operator from string", () => {
			const operator = Operator.create("SUBTRACT");
			expect(operator.toString()).toBe("SUBTRACT");
		});

		it("should create a MULTIPLY operator from string", () => {
			const operator = Operator.create("MULTIPLY");
			expect(operator.toString()).toBe("MULTIPLY");
		});

		it("should create a DIVIDE operator from string", () => {
			const operator = Operator.create("DIVIDE");
			expect(operator.toString()).toBe("DIVIDE");
		});

		it("should throw an error for invalid operator", () => {
			expect(() => Operator.create("INVALID")).toThrow(
				"Invalid operator: INVALID. Must be one of: ADD, SUBTRACT, MULTIPLY, DIVIDE",
			);
		});

		it("should throw an error for empty string", () => {
			expect(() => Operator.create("")).toThrow("Invalid operator");
		});

		it("should throw an error for lowercase operator", () => {
			expect(() => Operator.create("add")).toThrow("Invalid operator");
		});
	});

	describe("fromType", () => {
		it.each(OPERATORS)("should create %s operator from type", (type) => {
			const operator = Operator.fromType(type);
			expect(operator.toString()).toBe(type);
		});
	});

	describe("symbol", () => {
		it.each([
			["ADD", "+"],
			["SUBTRACT", "-"],
			["MULTIPLY", "*"],
			["DIVIDE", "/"],
		] as const)("%s should have symbol %s", (type, expectedSymbol) => {
			const operator = Operator.fromType(type as OperatorType);
			expect(operator.symbol).toBe(expectedSymbol);
		});
	});

	describe("displaySymbol", () => {
		it("should return + for ADD", () => {
			const operator = Operator.fromType("ADD");
			expect(operator.displaySymbol).toBe("+");
		});

		it("should return minus sign for SUBTRACT", () => {
			const operator = Operator.fromType("SUBTRACT");
			expect(operator.displaySymbol).toBe("\u2212"); // minus sign
		});

		it("should return multiplication sign for MULTIPLY", () => {
			const operator = Operator.fromType("MULTIPLY");
			expect(operator.displaySymbol).toBe("\u00D7"); // multiplication sign
		});

		it("should return division sign for DIVIDE", () => {
			const operator = Operator.fromType("DIVIDE");
			expect(operator.displaySymbol).toBe("\u00F7"); // division sign
		});
	});

	describe("calculate", () => {
		describe("ADD", () => {
			const operator = Operator.fromType("ADD");

			it("should add two positive numbers", () => {
				expect(operator.calculate(5, 3)).toBe(8);
			});

			it("should add positive and negative numbers", () => {
				expect(operator.calculate(5, -3)).toBe(2);
			});

			it("should add two negative numbers", () => {
				expect(operator.calculate(-5, -3)).toBe(-8);
			});

			it("should add zero", () => {
				expect(operator.calculate(5, 0)).toBe(5);
			});

			it("should handle decimal numbers", () => {
				expect(operator.calculate(1.5, 2.5)).toBe(4);
			});
		});

		describe("SUBTRACT", () => {
			const operator = Operator.fromType("SUBTRACT");

			it("should subtract two positive numbers", () => {
				expect(operator.calculate(5, 3)).toBe(2);
			});

			it("should subtract negative from positive", () => {
				expect(operator.calculate(5, -3)).toBe(8);
			});

			it("should subtract positive from negative", () => {
				expect(operator.calculate(-5, 3)).toBe(-8);
			});

			it("should subtract zero", () => {
				expect(operator.calculate(5, 0)).toBe(5);
			});

			it("should handle decimal numbers", () => {
				expect(operator.calculate(5.5, 2.5)).toBe(3);
			});
		});

		describe("MULTIPLY", () => {
			const operator = Operator.fromType("MULTIPLY");

			it("should multiply two positive numbers", () => {
				expect(operator.calculate(5, 3)).toBe(15);
			});

			it("should multiply positive and negative numbers", () => {
				expect(operator.calculate(5, -3)).toBe(-15);
			});

			it("should multiply two negative numbers", () => {
				expect(operator.calculate(-5, -3)).toBe(15);
			});

			it("should multiply by zero", () => {
				expect(operator.calculate(5, 0)).toBe(0);
			});

			it("should handle decimal numbers", () => {
				expect(operator.calculate(2.5, 4)).toBe(10);
			});
		});

		describe("DIVIDE", () => {
			const operator = Operator.fromType("DIVIDE");

			it("should divide two positive numbers", () => {
				expect(operator.calculate(6, 3)).toBe(2);
			});

			it("should divide positive by negative", () => {
				expect(operator.calculate(6, -3)).toBe(-2);
			});

			it("should divide negative by positive", () => {
				expect(operator.calculate(-6, 3)).toBe(-2);
			});

			it("should divide two negative numbers", () => {
				expect(operator.calculate(-6, -3)).toBe(2);
			});

			it("should throw an error when dividing by zero", () => {
				expect(() => operator.calculate(5, 0)).toThrow(
					"Division by zero is not allowed",
				);
			});

			it("should handle decimal results", () => {
				expect(operator.calculate(5, 2)).toBe(2.5);
			});

			it("should handle zero as dividend", () => {
				expect(operator.calculate(0, 5)).toBe(0);
			});
		});
	});

	describe("isValidWith", () => {
		it("should return true for ADD with any operand", () => {
			const operator = Operator.fromType("ADD");
			expect(operator.isValidWith(5)).toBe(true);
			expect(operator.isValidWith(0)).toBe(true);
			expect(operator.isValidWith(-5)).toBe(true);
		});

		it("should return true for SUBTRACT with any operand", () => {
			const operator = Operator.fromType("SUBTRACT");
			expect(operator.isValidWith(5)).toBe(true);
			expect(operator.isValidWith(0)).toBe(true);
			expect(operator.isValidWith(-5)).toBe(true);
		});

		it("should return true for MULTIPLY with any operand", () => {
			const operator = Operator.fromType("MULTIPLY");
			expect(operator.isValidWith(5)).toBe(true);
			expect(operator.isValidWith(0)).toBe(true);
			expect(operator.isValidWith(-5)).toBe(true);
		});

		it("should return true for DIVIDE with non-zero operand", () => {
			const operator = Operator.fromType("DIVIDE");
			expect(operator.isValidWith(5)).toBe(true);
			expect(operator.isValidWith(-5)).toBe(true);
		});

		it("should return false for DIVIDE with zero operand", () => {
			const operator = Operator.fromType("DIVIDE");
			expect(operator.isValidWith(0)).toBe(false);
		});
	});

	describe("equals", () => {
		it("should return true for same operator types", () => {
			const op1 = Operator.fromType("ADD");
			const op2 = Operator.fromType("ADD");
			expect(op1.equals(op2)).toBe(true);
		});

		it("should return false for different operator types", () => {
			const op1 = Operator.fromType("ADD");
			const op2 = Operator.fromType("SUBTRACT");
			expect(op1.equals(op2)).toBe(false);
		});

		it("should be symmetric", () => {
			const op1 = Operator.fromType("MULTIPLY");
			const op2 = Operator.fromType("MULTIPLY");
			expect(op1.equals(op2)).toBe(op2.equals(op1));
		});
	});

	describe("edge cases", () => {
		it("should handle very large numbers", () => {
			const add = Operator.fromType("ADD");
			const result = add.calculate(Number.MAX_SAFE_INTEGER, 1);
			expect(result).toBe(Number.MAX_SAFE_INTEGER + 1);
		});

		it("should handle very small numbers", () => {
			const multiply = Operator.fromType("MULTIPLY");
			const result = multiply.calculate(0.1, 0.2);
			expect(result).toBeCloseTo(0.02);
		});
	});
});
