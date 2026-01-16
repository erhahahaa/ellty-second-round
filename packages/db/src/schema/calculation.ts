import { relations } from "drizzle-orm";
import {
	index,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// ============================================
// Enums
// ============================================

export const operatorEnum = pgEnum("operator", [
	"ADD",
	"SUBTRACT",
	"MULTIPLY",
	"DIVIDE",
]);

// ============================================
// Tables
// ============================================

/**
 * Calculation Root - Starting numbers that begin a calculation tree
 * Analogous to a "post" in social media
 */
export const calculationRoot = pgTable(
	"calculation_root",
	{
		id: text("id").primaryKey(),
		value: numeric("value", { precision: 20, scale: 10 }).notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("calculation_root_user_id_idx").on(table.userId),
		index("calculation_root_created_at_idx").on(table.createdAt),
	],
);

/**
 * Calculation Operation - Operations applied to roots or other operations
 * Analogous to a "comment" or "reply" in social media
 * Self-referencing for tree structure
 */
export const calculationOperation = pgTable(
	"calculation_operation",
	{
		id: text("id").primaryKey(),
		// Parent references - exactly one must be set
		parentRootId: text("parent_root_id").references(() => calculationRoot.id, {
			onDelete: "cascade",
		}),
		parentOperationId: text("parent_operation_id"),
		// Operation data
		operator: operatorEnum("operator").notNull(),
		operand: numeric("operand", { precision: 20, scale: 10 }).notNull(),
		result: numeric("result", { precision: 20, scale: 10 }).notNull(),
		// Metadata
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("calculation_operation_parent_root_id_idx").on(table.parentRootId),
		index("calculation_operation_parent_operation_id_idx").on(
			table.parentOperationId,
		),
		index("calculation_operation_user_id_idx").on(table.userId),
		index("calculation_operation_created_at_idx").on(table.createdAt),
	],
);

// ============================================
// Relations
// ============================================

export const calculationRootRelations = relations(
	calculationRoot,
	({ one, many }) => ({
		user: one(user, {
			fields: [calculationRoot.userId],
			references: [user.id],
		}),
		operations: many(calculationOperation),
	}),
);

export const calculationOperationRelations = relations(
	calculationOperation,
	({ one, many }) => ({
		user: one(user, {
			fields: [calculationOperation.userId],
			references: [user.id],
		}),
		parentRoot: one(calculationRoot, {
			fields: [calculationOperation.parentRootId],
			references: [calculationRoot.id],
		}),
		parentOperation: one(calculationOperation, {
			fields: [calculationOperation.parentOperationId],
			references: [calculationOperation.id],
			relationName: "childOperations",
		}),
		childOperations: many(calculationOperation, {
			relationName: "childOperations",
		}),
	}),
);

// ============================================
// Types
// ============================================

export type CalculationRootRecord = typeof calculationRoot.$inferSelect;
export type NewCalculationRootRecord = typeof calculationRoot.$inferInsert;

export type CalculationOperationRecord =
	typeof calculationOperation.$inferSelect;
export type NewCalculationOperationRecord =
	typeof calculationOperation.$inferInsert;

export type OperatorType = (typeof operatorEnum.enumValues)[number];
