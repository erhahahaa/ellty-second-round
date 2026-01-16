/**
 * Create Root Form Component
 *
 * Form to create a new starting number for a calculation thread.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orpc } from "@/utils/orpc";

export function CreateRootForm() {
	const [value, setValue] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const queryClient = useQueryClient();

	const createRootMutation = useMutation(
		orpc.calculation.createRoot.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.calculation.getFullTree.key(),
				});
				setValue("");
				setIsOpen(false);
			},
		}),
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const numValue = Number.parseFloat(value);
		if (Number.isNaN(numValue)) return;
		createRootMutation.mutate({ value: numValue });
	};

	if (!isOpen) {
		return (
			<Button
				onClick={() => setIsOpen(true)}
				variant="outline"
				className="w-full"
			>
				Start a new calculation
			</Button>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Input
				type="number"
				step="any"
				placeholder="Enter a starting number..."
				value={value}
				onChange={(e) => setValue(e.target.value)}
				className="flex-1"
				autoFocus
			/>
			<Button type="submit" disabled={createRootMutation.isPending || !value}>
				{createRootMutation.isPending ? "Creating..." : "Create"}
			</Button>
			<Button
				type="button"
				variant="ghost"
				onClick={() => {
					setIsOpen(false);
					setValue("");
				}}
			>
				Cancel
			</Button>
		</form>
	);
}
