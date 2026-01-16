import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Operator } from "../value-objects/operator";
import { CalculationOperation } from "./calculation-operation";
import { CalculationRoot } from "./calculation-root";

// Store original crypto
const originalRandomUUID = crypto.randomUUID;

describe("CalculationRoot Entity", () => {
	beforeEach(() => {
		// Mock crypto.randomUUID
		crypto.randomUUID = vi.fn(() => "test-uuid-123");
	});

	afterEach(() => {
		// Restore original
		crypto.randomUUID = originalRandomUUID;
	});

	describe("create", () => {
		it("should create a CalculationRoot with valid input", () => {
			const root = CalculationRoot.create({
				value: 42,
				userId: "user-123",
				username: "testuser",
			});

			expect(root.id).toBe("test-uuid-123");
			expect(root.value).toBe(42);
			expect(root.userId).toBe("user-123");
			expect(root.username).toBe("testuser");
			expect(root.createdAt).toBeInstanceOf(Date);
			expect(root.updatedAt).toBeInstanceOf(Date);
			expect(root.operations).toEqual([]);
		});

		it("should create a CalculationRoot without username", () => {
			const root = CalculationRoot.create({
				value: 100,
				userId: "user-456",
			});

			expect(root.value).toBe(100);
			expect(root.userId).toBe("user-456");
			expect(root.username).toBeUndefined();
		});

		it("should create a CalculationRoot with negative value", () => {
			const root = CalculationRoot.create({
				value: -50,
				userId: "user-123",
			});

			expect(root.value).toBe(-50);
		});

		it("should create a CalculationRoot with zero value", () => {
			const root = CalculationRoot.create({
				value: 0,
				userId: "user-123",
			});

			expect(root.value).toBe(0);
		});

		it("should create a CalculationRoot with decimal value", () => {
			const root = CalculationRoot.create({
				value: 3.14159,
				userId: "user-123",
			});

			expect(root.value).toBe(3.14159);
		});

		it("should throw an error for Infinity", () => {
			expect(() =>
				CalculationRoot.create({
					value: Number.POSITIVE_INFINITY,
					userId: "user-123",
				}),
			).toThrow("Value must be a finite number");
		});

		it("should throw an error for negative Infinity", () => {
			expect(() =>
				CalculationRoot.create({
					value: Number.NEGATIVE_INFINITY,
					userId: "user-123",
				}),
			).toThrow("Value must be a finite number");
		});

		it("should throw an error for NaN", () => {
			expect(() =>
				CalculationRoot.create({
					value: Number.NaN,
					userId: "user-123",
				}),
			).toThrow("Value must be a finite number");
		});
	});

	describe("fromPersistence", () => {
		it("should reconstitute a CalculationRoot from persistence data", () => {
			const createdAt = new Date("2024-01-01T00:00:00Z");
			const updatedAt = new Date("2024-01-02T00:00:00Z");

			const root = CalculationRoot.fromPersistence({
				id: "persisted-id",
				value: 99,
				userId: "user-abc",
				username: "persisteduser",
				createdAt,
				updatedAt,
			});

			expect(root.id).toBe("persisted-id");
			expect(root.value).toBe(99);
			expect(root.userId).toBe("user-abc");
			expect(root.username).toBe("persisteduser");
			expect(root.createdAt).toBe(createdAt);
			expect(root.updatedAt).toBe(updatedAt);
		});

		it("should reconstitute with undefined username", () => {
			const root = CalculationRoot.fromPersistence({
				id: "persisted-id",
				value: 100,
				userId: "user-123",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			expect(root.username).toBeUndefined();
		});
	});

	describe("operations management", () => {
		it("should start with empty operations", () => {
			const root = CalculationRoot.create({
				value: 10,
				userId: "user-123",
			});

			expect(root.operations).toHaveLength(0);
		});

		it("should add an operation", () => {
			const root = CalculationRoot.create({
				value: 10,
				userId: "user-123",
			});

			const operation = CalculationOperation.create({
				parentRootId: root.id,
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: root.value,
				userId: "user-123",
			});

			root.addOperation(operation);

			expect(root.operations).toHaveLength(1);
			expect(root.operations[0]).toBe(operation);
		});

		it("should set multiple operations", () => {
			const root = CalculationRoot.create({
				value: 10,
				userId: "user-123",
			});

			const op1 = CalculationOperation.create({
				parentRootId: root.id,
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: root.value,
				userId: "user-123",
			});

			const op2 = CalculationOperation.create({
				parentRootId: root.id,
				operator: Operator.fromType("MULTIPLY"),
				operand: 2,
				parentValue: root.value,
				userId: "user-456",
			});

			root.setOperations([op1, op2]);

			expect(root.operations).toHaveLength(2);
		});

		it("should return readonly operations array", () => {
			const root = CalculationRoot.create({
				value: 10,
				userId: "user-123",
			});

			const operations = root.operations;
			// TypeScript should prevent this, but runtime check
			expect(Object.isFrozen(operations)).toBe(false); // It's readonly, not frozen
		});
	});

	describe("getTotalOperationCount", () => {
		it("should return 0 for root with no operations", () => {
			const root = CalculationRoot.create({
				value: 10,
				userId: "user-123",
			});

			expect(root.getTotalOperationCount()).toBe(0);
		});

		it("should count direct operations", () => {
			const root = CalculationRoot.create({
				value: 10,
				userId: "user-123",
			});

			const op1 = CalculationOperation.create({
				parentRootId: root.id,
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: root.value,
				userId: "user-123",
			});

			const op2 = CalculationOperation.create({
				parentRootId: root.id,
				operator: Operator.fromType("SUBTRACT"),
				operand: 3,
				parentValue: root.value,
				userId: "user-123",
			});

			root.setOperations([op1, op2]);

			expect(root.getTotalOperationCount()).toBe(2);
		});

		it("should count nested operations recursively", () => {
			const root = CalculationRoot.create({
				value: 10,
				userId: "user-123",
			});

			// Create parent operation
			const parentOp = CalculationOperation.create({
				parentRootId: root.id,
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: root.value,
				userId: "user-123",
			});

			// Create child operation
			const childOp = CalculationOperation.create({
				parentOperationId: parentOp.id,
				operator: Operator.fromType("MULTIPLY"),
				operand: 2,
				parentValue: parentOp.result,
				userId: "user-123",
			});

			parentOp.setChildren([childOp]);
			root.setOperations([parentOp]);

			expect(root.getTotalOperationCount()).toBe(2);
		});

		it("should count deeply nested operations", () => {
			const root = CalculationRoot.create({
				value: 10,
				userId: "user-123",
			});

			const level1 = CalculationOperation.create({
				parentRootId: root.id,
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: root.value,
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

			level2.setChildren([level3]);
			level1.setChildren([level2]);
			root.setOperations([level1]);

			expect(root.getTotalOperationCount()).toBe(3);
		});
	});

	describe("toJSON", () => {
		it("should serialize root to JSON", () => {
			const root = CalculationRoot.create({
				value: 42,
				userId: "user-123",
				username: "testuser",
			});

			const json = root.toJSON();

			expect(json).toEqual({
				id: "test-uuid-123",
				value: 42,
				userId: "user-123",
				username: "testuser",
				createdAt: root.createdAt,
				updatedAt: root.updatedAt,
				operations: [],
			});
		});

		it("should serialize root with operations", () => {
			const root = CalculationRoot.create({
				value: 10,
				userId: "user-123",
			});

			const operation = CalculationOperation.create({
				parentRootId: root.id,
				operator: Operator.fromType("ADD"),
				operand: 5,
				parentValue: root.value,
				userId: "user-123",
			});

			root.addOperation(operation);

			const json = root.toJSON();

			expect(json.operations).toHaveLength(1);
			expect(json.operations[0]!.operand).toBe(5);
			expect(json.operations[0]!.result).toBe(15);
		});
	});

	describe("immutability", () => {
		it("should have readonly properties enforced by TypeScript", () => {
			const root = CalculationRoot.create({
				value: 10,
				userId: "user-123",
			});

			// These properties are readonly at compile time
			// Verify they exist and are set correctly
			expect(root.id).toBe("test-uuid-123");
			expect(root.value).toBe(10);
			expect(root.userId).toBe("user-123");
		});
	});
});
