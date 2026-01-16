/**
 * Operation Form Component
 *
 * Form to add a new operation (reply) to a root or another operation.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orpc } from "@/utils/orpc";
import { getOperatorSymbol, type OperatorType } from "./operator-badge";

const OPERATORS: OperatorType[] = ["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"];

interface OperationFormProps {
	parentRootId?: string;
	parentOperationId?: string;
	onCancel: () => void;
}

export function OperationForm({
	parentRootId,
	parentOperationId,
	onCancel,
}: OperationFormProps) {
	const [operator, setOperator] = useState<OperatorType>("ADD");
	const [operand, setOperand] = useState("");
	const queryClient = useQueryClient();

	const createOperationMutation = useMutation(
		orpc.calculation.createOperation.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.calculation.getFullTree.key(),
				});
				setOperand("");
				onCancel();
			},
		}),
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const numOperand = Number.parseFloat(operand);
		if (Number.isNaN(numOperand)) return;

		// Validate division by zero
		if (operator === "DIVIDE" && numOperand === 0) {
			return;
		}

		createOperationMutation.mutate({
			parentRootId,
			parentOperationId,
			operator,
			operand: numOperand,
		});
	};

	return (
		<form onSubmit={handleSubmit} className="flex items-center gap-2">
			<div className="flex rounded-md border border-input">
				{OPERATORS.map((op) => (
					<button
						key={op}
						type="button"
						onClick={() => setOperator(op)}
						className={`h-9 w-9 font-bold font-mono text-sm transition-colors ${
							operator === op
								? "bg-primary text-primary-foreground"
								: "hover:bg-muted"
						} ${op === "ADD" ? "rounded-l-md" : ""} ${op === "DIVIDE" ? "rounded-r-md" : ""}`}
					>
						{getOperatorSymbol(op)}
					</button>
				))}
			</div>
			<Input
				type="number"
				step="any"
				placeholder="Operand..."
				value={operand}
				onChange={(e) => setOperand(e.target.value)}
				className="w-32"
				autoFocus
			/>
			<Button
				type="submit"
				size="sm"
				disabled={createOperationMutation.isPending || !operand}
			>
				{createOperationMutation.isPending ? "..." : "Apply"}
			</Button>
			<Button type="button" size="sm" variant="ghost" onClick={onCancel}>
				Cancel
			</Button>
		</form>
	);
}
