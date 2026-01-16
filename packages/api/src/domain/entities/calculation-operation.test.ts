import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Operator } from "../value-objects/operator";
import { CalculationOperation } from "./calculation-operation";

// Store original crypto.randomUUID
const originalRandomUUID = crypto.randomUUID.bind(crypto);

describe("CalculationOperation Entity", () => {
	beforeEach(() => {
		// Mock crypto.randomUUID - direct assignment for Bun compatibility
		crypto.randomUUID = () => "test-op-uuid-123";
	});

	afterEach(() => {
		crypto.randomUUID = originalRandomUUID;
	});

	describe("create", () => {
		it("should create an operation with root parent", () => {
			const operation = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: 10,
				userId: "user-123",
				username: "testuser",
			});

			expect(operation.id).toBe("test-op-uuid-123");
			expect(operation.parentRootId).toBe("root-123");
			expect(operation.parentOperationId).toBeNull();
			expect(operation.operand).toBe(5);
			expect(operation.result).toBe(15); // 10 + 5
			expect(operation.userId).toBe("user-123");
			expect(operation.username).toBe("testuser");
			expect(operation.createdAt).toBeInstanceOf(Date);
			expect(operation.updatedAt).toBeInstanceOf(Date);
			expect(operation.children).toEqual([]);
		});

		it("should create an operation with operation parent", () => {
			const operation = CalculationOperation.create({
				parentOperationId: "op-456",
				operator: Operator.fromType("MULTIPLY"),
				operand: 3,
				parentValue: 15,
				userId: "user-123",
			});

			expect(operation.parentRootId).toBeNull();
			expect(operation.parentOperationId).toBe("op-456");
			expect(operation.result).toBe(45); // 15 * 3
		});

		it("should throw error when no parent is provided", () => {
			expect(() =>
				CalculationOperation.create({
					operator: Operator.fromType("ADD"),
					operand: 5,
					parentValue: 10,
					userId: "user-123",
				}),
			).toThrow("Operation must have a parent (root or operation)");
		});

		it("should throw error when both parents are provided", () => {
			expect(() =>
				CalculationOperation.create({
					parentRootId: "root-123",
					parentOperationId: "op-456",
					operator: Operator.fromType("ADD"),
					operand: 5,
					parentValue: 10,
					userId: "user-123",
				}),
			).toThrow("Operation cannot have both root and operation parent");
		});

		it("should throw error for division by zero", () => {
			expect(() =>
				CalculationOperation.create({
					parentRootId: "root-123",
					operator: Operator.fromType("DIVIDE"),
					operand: 0,
					parentValue: 10,
					userId: "user-123",
				}),
			).toThrow("Invalid operation: division by zero");
		});

		describe("calculations", () => {
			it("should calculate ADD correctly", () => {
				const operation = CalculationOperation.create({
					parentRootId: "root-123",
					operator: Operator.fromType("ADD"),
					operand: 7,
					parentValue: 10,
					userId: "user-123",
				});

				expect(operation.result).toBe(17);
			});

			it("should calculate SUBTRACT correctly", () => {
				const operation = CalculationOperation.create({
					parentRootId: "root-123",
					operator: Operator.fromType("SUBTRACT"),
					operand: 3,
					parentValue: 10,
					userId: "user-123",
				});

				expect(operation.result).toBe(7);
			});

			it("should calculate MULTIPLY correctly", () => {
				const operation = CalculationOperation.create({
					parentRootId: "root-123",
					operator: Operator.fromType("MULTIPLY"),
					operand: 4,
					parentValue: 10,
					userId: "user-123",
				});

				expect(operation.result).toBe(40);
			});

			it("should calculate DIVIDE correctly", () => {
				const operation = CalculationOperation.create({
					parentRootId: "root-123",
					operator: Operator.fromType("DIVIDE"),
					operand: 2,
					parentValue: 10,
					userId: "user-123",
				});

				expect(operation.result).toBe(5);
			});

			it("should handle negative numbers", () => {
				const operation = CalculationOperation.create({
					parentRootId: "root-123",
					operator: Operator.fromType("ADD"),
					operand: -5,
					parentValue: 10,
					userId: "user-123",
				});

				expect(operation.result).toBe(5);
			});

			it("should handle decimal numbers", () => {
				const operation = CalculationOperation.create({
					parentRootId: "root-123",
					operator: Operator.fromType("DIVIDE"),
					operand: 3,
					parentValue: 10,
					userId: "user-123",
				});

				expect(operation.result).toBeCloseTo(3.3333, 4);
			});
		});
	});

	describe("fromPersistence", () => {
		it("should reconstitute an operation from persistence data", () => {
			const createdAt = new Date("2024-01-01T00:00:00Z");
			const updatedAt = new Date("2024-01-02T00:00:00Z");

			const operation = CalculationOperation.fromPersistence({
				id: "persisted-op-id",
				parentRootId: "root-123",
				parentOperationId: null,
				operator: "ADD",
				operand: 5,
				result: 15,
				userId: "user-abc",
				username: "persisteduser",
				createdAt,
				updatedAt,
			});

			expect(operation.id).toBe("persisted-op-id");
			expect(operation.parentRootId).toBe("root-123");
			expect(operation.parentOperationId).toBeNull();
			expect(operation.operator.toString()).toBe("ADD");
			expect(operation.operand).toBe(5);
			expect(operation.result).toBe(15);
			expect(operation.userId).toBe("user-abc");
			expect(operation.username).toBe("persisteduser");
			expect(operation.createdAt).toBe(createdAt);
			expect(operation.updatedAt).toBe(updatedAt);
		});

		it("should reconstitute with operation parent", () => {
			const operation = CalculationOperation.fromPersistence({
				id: "persisted-op-id",
				parentRootId: null,
				parentOperationId: "parent-op-123",
				operator: "MULTIPLY",
				operand: 2,
				result: 20,
				userId: "user-abc",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			expect(operation.parentRootId).toBeNull();
			expect(operation.parentOperationId).toBe("parent-op-123");
		});
	});

	describe("children management", () => {
		it("should start with empty children", () => {
			const operation = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: 10,
				userId: "user-123",
			});

			expect(operation.children).toHaveLength(0);
		});

		it("should add a child operation", () => {
			const parent = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: 10,
				userId: "user-123",
			});

			const child = CalculationOperation.create({
				parentOperationId: parent.id,
				operator: Operator.fromType("MULTIPLY"),
				operand: 2,
				parentValue: parent.result,
				userId: "user-123",
			});

			parent.addChild(child);

			expect(parent.children).toHaveLength(1);
			expect(parent.children[0]).toBe(child);
		});

		it("should set multiple children", () => {
			const parent = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: 10,
				userId: "user-123",
			});

			const child1 = CalculationOperation.create({
				parentOperationId: parent.id,
				operator: Operator.fromType("MULTIPLY"),
				operand: 2,
				parentValue: parent.result,
				userId: "user-123",
			});

			const child2 = CalculationOperation.create({
				parentOperationId: parent.id,
				operator: Operator.fromType("DIVIDE"),
				operand: 3,
				parentValue: parent.result,
				userId: "user-456",
			});

			parent.setChildren([child1, child2]);

			expect(parent.children).toHaveLength(2);
		});
	});

	describe("toDisplayString", () => {
		it("should display ADD operation correctly", () => {
			const operation = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: 10,
				userId: "user-123",
			});

			expect(operation.toDisplayString()).toBe("+ 5 = 15");
		});

		it("should display SUBTRACT operation with unicode minus", () => {
			const operation = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("SUBTRACT"),
				operand: 3,
				parentValue: 10,
				userId: "user-123",
			});

			expect(operation.toDisplayString()).toBe("\u2212 3 = 7");
		});

		it("should display MULTIPLY operation with unicode times", () => {
			const operation = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("MULTIPLY"),
				operand: 4,
				parentValue: 10,
				userId: "user-123",
			});

			expect(operation.toDisplayString()).toBe("\u00D7 4 = 40");
		});

		it("should display DIVIDE operation with unicode division", () => {
			const operation = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("DIVIDE"),
				operand: 2,
				parentValue: 10,
				userId: "user-123",
			});

			expect(operation.toDisplayString()).toBe("\u00F7 2 = 5");
		});
	});

	describe("toJSON", () => {
		it("should serialize operation to JSON", () => {
			const operation = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: 10,
				userId: "user-123",
				username: "testuser",
			});

			const json = operation.toJSON();

			expect(json).toEqual({
				id: "test-op-uuid-123",
				parentRootId: "root-123",
				parentOperationId: null,
				operator: "ADD",
				operand: 5,
				result: 15,
				userId: "user-123",
				username: "testuser",
				createdAt: operation.createdAt,
				updatedAt: operation.updatedAt,
				children: [],
			});
		});

		it("should serialize operation with children", () => {
			const parent = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: 10,
				userId: "user-123",
			});

			const child = CalculationOperation.create({
				parentOperationId: parent.id,
				operator: Operator.fromType("MULTIPLY"),
				operand: 2,
				parentValue: parent.result,
				userId: "user-123",
			});

			parent.addChild(child);

			const json = parent.toJSON();

			expect(json.children).toHaveLength(1);
			expect(json.children[0]!.operand).toBe(2);
			expect(json.children[0]!.result).toBe(30); // 15 * 2
		});

		it("should serialize deeply nested children", () => {
			const level1 = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: 10,
				userId: "user-123",
			});

			const level2 = CalculationOperation.create({
				parentOperationId: level1.id,
				operator: Operator.fromType("MULTIPLY"),
				operand: 2,
				parentValue: level1.result,
				userId: "user-123",
			});

			const level3 = CalculationOperation.create({
				parentOperationId: level2.id,
				operator: Operator.fromType("SUBTRACT"),
				operand: 10,
				parentValue: level2.result,
				userId: "user-123",
			});

			level2.addChild(level3);
			level1.addChild(level2);

			const json = level1.toJSON();

			expect(json.children).toHaveLength(1);
			expect(json.children[0]!.children).toHaveLength(1);
			expect(json.children[0]!.children[0]!.result).toBe(20); // 30 - 10
		});
	});

	describe("operator property", () => {
		it("should return Operator value object", () => {
			const operation = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: 10,
				userId: "user-123",
			});

			expect(operation.operator).toBeInstanceOf(Operator);
			expect(operation.operator.toString()).toBe("ADD");
		});

		it("should preserve operator through persistence", () => {
			const operation = CalculationOperation.fromPersistence({
				id: "op-id",
				parentRootId: "root-123",
				parentOperationId: null,
				operator: "MULTIPLY",
				operand: 5,
				result: 50,
				userId: "user-123",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			expect(operation.operator.toString()).toBe("MULTIPLY");
			expect(operation.operator.symbol).toBe("*");
		});
	});

	describe("edge cases", () => {
		it("should handle very large numbers", () => {
			const operation = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("ADD"),
				operand: Number.MAX_SAFE_INTEGER,
				parentValue: 1,
				userId: "user-123",
			});

			expect(operation.result).toBe(Number.MAX_SAFE_INTEGER + 1);
		});

		it("should handle very small decimal numbers", () => {
			const operation = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("MULTIPLY"),
				operand: 0.0001,
				parentValue: 0.0001,
				userId: "user-123",
			});

			expect(operation.result).toBeCloseTo(0.00000001);
		});

		it("should handle zero operand for non-division", () => {
			const operation = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("ADD"),
				operand: 0,
				parentValue: 10,
				userId: "user-123",
			});

			expect(operation.result).toBe(10);
		});

		it("should handle zero parent value", () => {
			const operation = CalculationOperation.create({
				parentRootId: "root-123",
				operator: Operator.fromType("MULTIPLY"),
				operand: 100,
				parentValue: 0,
				userId: "user-123",
			});

			expect(operation.result).toBe(0);
		});
	});
});
