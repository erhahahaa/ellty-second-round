/**
 * Drizzle Unit of Work Implementation
 *
 * Implements the Unit of Work pattern for transaction management.
 * Wraps all database operations in an ACID transaction.
 */

import type { Database, Transaction } from "@ellty-second-round/db";
import type { ICalculationRepository, IUnitOfWork } from "../../domain";
import { DrizzleCalculationRepository } from "./drizzle-calculation.repository";

export class DrizzleUnitOfWork implements IUnitOfWork {
	private _calculationRepository: ICalculationRepository | null = null;

	constructor(private readonly db: Database) {}

	/**
	 * Get the calculation repository.
	 * When not in a transaction, uses the injected db connection.
	 */
	get calculationRepository(): ICalculationRepository {
		if (!this._calculationRepository) {
			this._calculationRepository = new DrizzleCalculationRepository(this.db);
		}
		return this._calculationRepository;
	}

	/**
	 * Execute a function within a database transaction.
	 * All operations within the callback are atomic - they all succeed or all fail.
	 *
	 * @param fn - Function to execute within the transaction
	 * @returns The result of the function
	 * @throws Re-throws any error from the function (transaction will be rolled back)
	 */
	async transaction<T>(fn: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
		return await this.db.transaction(async (tx) => {
			// Create a new UnitOfWork scoped to this transaction
			const transactionUow = new TransactionUnitOfWork(tx);
			return await fn(transactionUow);
		});
	}
}

/**
 * Transaction-scoped Unit of Work
 *
 * Created during a transaction to scope all repository operations
 * to that specific transaction.
 */
class TransactionUnitOfWork implements IUnitOfWork {
	private _calculationRepository: ICalculationRepository;

	constructor(tx: Transaction) {
		this._calculationRepository = new DrizzleCalculationRepository(tx);
	}

	get calculationRepository(): ICalculationRepository {
		return this._calculationRepository;
	}

	async transaction<T>(fn: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
		// Already in a transaction, just execute the function with this UoW
		// Drizzle supports nested transactions via savepoints
		return await fn(this);
	}
}
