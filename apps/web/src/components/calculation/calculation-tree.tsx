/**
 * Calculation Tree Component
 *
 * Main container that fetches and displays all calculation trees.
 */

import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";
import { CreateRootForm } from "./create-root-form";
import type { OperatorType } from "./operator-badge";
import { RootNode } from "./root-node";

// Type definitions matching the API response
interface Operation {
	id: string;
	parentRootId: string | null;
	parentOperationId: string | null;
	operator: OperatorType;
	operand: number;
	result: number;
	userId: string;
	username?: string;
	children: Operation[];
	createdAt: string;
	updatedAt: string;
}

interface CalculationRoot {
	id: string;
	value: number;
	userId: string;
	username?: string;
	operations: Operation[];
	createdAt: string;
	updatedAt: string;
}

interface CalculationTreeProps {
	isAuthenticated: boolean;
}

export function CalculationTree({ isAuthenticated }: CalculationTreeProps) {
	const {
		data: trees,
		isLoading,
		error,
	} = useQuery(orpc.calculation.getFullTree.queryOptions());

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-32 w-full" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
				Failed to load calculations: {error.message}
			</div>
		);
	}

	// Cast the data to our type (API returns compatible structure)
	const typedTrees = trees as CalculationRoot[] | undefined;

	return (
		<div className="space-y-4">
			{/* Create new root form */}
			{isAuthenticated && <CreateRootForm />}

			{/* Empty state */}
			{typedTrees?.length === 0 && (
				<div className="rounded-lg border border-dashed p-8 text-center">
					<p className="text-muted-foreground">No calculations yet.</p>
					{isAuthenticated ? (
						<p className="mt-1 text-muted-foreground/60 text-sm">
							Start a new calculation above!
						</p>
					) : (
						<p className="mt-1 text-muted-foreground/60 text-sm">
							Sign in to start a calculation.
						</p>
					)}
				</div>
			)}

			{/* Calculation trees */}
			{typedTrees?.map((root) => (
				<RootNode key={root.id} root={root} isAuthenticated={isAuthenticated} />
			))}
		</div>
	);
}
