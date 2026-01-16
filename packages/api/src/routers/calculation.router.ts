/**
 * Calculation Router
 *
 * oRPC handlers for calculation operations.
 * Exposes the CalculationService via API endpoints.
 */

import { z } from "zod";
import { OPERATORS } from "../domain";
import { protectedProcedure, publicProcedure } from "../index";

// ==========================================
// Input Schemas
// ==========================================

const createRootSchema = z.object({
	value: z.number().finite(),
});

const createOperationSchema = z.object({
	parentRootId: z.string().uuid().optional(),
	parentOperationId: z.string().uuid().optional(),
	operator: z.enum(OPERATORS),
	operand: z.number().finite(),
});

const getRootByIdSchema = z.object({
	id: z.string().uuid(),
});

// ==========================================
// Router Definition
// ==========================================

export const calculationRouter = {
	/**
	 * Get the full calculation tree (all roots with their operations)
	 * Public endpoint - anyone can view calculations
	 */
	getFullTree: publicProcedure.handler(async ({ context }) => {
		const trees = await context.calculationService.getFullTree();
		return trees.map((tree: { toJSON: () => unknown }) => tree.toJSON());
	}),

	/**
	 * Get a single root by ID with its operation tree
	 * Public endpoint - anyone can view calculations
	 */
	getRootById: publicProcedure
		.input(getRootByIdSchema)
		.handler(async ({ input, context }) => {
			const root = await context.calculationService.getRootById(input.id);
			return root?.toJSON() ?? null;
		}),

	/**
	 * Create a new calculation root (starting number)
	 * Protected endpoint - requires authentication
	 */
	createRoot: protectedProcedure
		.input(createRootSchema)
		.handler(async ({ input, context }) => {
			const root = await context.calculationService.createRoot({
				value: input.value,
				userId: context.session.user.id,
				username: context.session.user.name ?? undefined,
			});
			return root.toJSON();
		}),

	/**
	 * Create a new calculation operation (reply to root or another operation)
	 * Protected endpoint - requires authentication
	 */
	createOperation: protectedProcedure
		.input(createOperationSchema)
		.handler(async ({ input, context }) => {
			// Validate that exactly one parent is specified
			if (!input.parentRootId && !input.parentOperationId) {
				throw new Error(
					"Must specify either parentRootId or parentOperationId",
				);
			}
			if (input.parentRootId && input.parentOperationId) {
				throw new Error(
					"Cannot specify both parentRootId and parentOperationId",
				);
			}

			const operation = await context.calculationService.createOperation({
				parentRootId: input.parentRootId,
				parentOperationId: input.parentOperationId,
				operator: input.operator,
				operand: input.operand,
				userId: context.session.user.id,
				username: context.session.user.name ?? undefined,
			});
			return operation.toJSON();
		}),
};
