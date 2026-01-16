/**
 * Calculation Repository Interface
 *
 * Abstraction for persistence layer - can be implemented by PostgreSQL, SQLite, D1, etc.
 * All methods that modify data should be called within a transaction (Unit of Work pattern).
 */

import type { CalculationOperation } from "../entities/calculation-operation";
import type { CalculationRoot } from "../entities/calculation-root";

/**
 * Unit of Work interface for transaction management
 * Implementations should wrap database transactions
 */
export interface IUnitOfWork {
	/**
	 * Execute a function within a transaction
	 * Automatically commits on success, rolls back on error
	 */
	transaction<T>(fn: (uow: IUnitOfWork) => Promise<T>): Promise<T>;

	/**
	 * Get the calculation repository scoped to this unit of work
	 */
	calculationRepository: ICalculationRepository;
}

/**
 * Calculation Repository Interface
 *
 * Provides data access methods for calculation entities.
 * When used within a transaction (via UnitOfWork), all operations are atomic.
 */
export interface ICalculationRepository {
	// ==========================================
	// Query Methods (Read)
	// ==========================================

	/**
	 * Find all calculation roots with their full operation trees
	 * Ordered by creation date (newest first)
	 */
	findAllRootsWithOperations(): Promise<CalculationRoot[]>;

	/**
	 * Find a single root by ID (without operations)
	 */
	findRootById(id: string): Promise<CalculationRoot | null>;

	/**
	 * Find a single root by ID with its full operation tree
	 */
	findRootByIdWithOperations(id: string): Promise<CalculationRoot | null>;

	/**
	 * Find a single operation by ID
	 */
	findOperationById(id: string): Promise<CalculationOperation | null>;

	/**
	 * Find all operations that are direct children of a root
	 */
	findOperationsByRootId(rootId: string): Promise<CalculationOperation[]>;

	/**
	 * Find all operations that are direct children of another operation
	 */
	findChildOperations(
		parentOperationId: string,
	): Promise<CalculationOperation[]>;

	// ==========================================
	// Command Methods (Write)
	// ==========================================

	/**
	 * Save a new calculation root
	 */
	saveRoot(root: CalculationRoot): Promise<void>;

	/**
	 * Save a new calculation operation
	 */
	saveOperation(operation: CalculationOperation): Promise<void>;

	/**
	 * Delete a calculation root and all its operations (cascade)
	 */
	deleteRoot(id: string): Promise<void>;

	/**
	 * Delete a calculation operation and all its child operations (cascade)
	 */
	deleteOperation(id: string): Promise<void>;
}
