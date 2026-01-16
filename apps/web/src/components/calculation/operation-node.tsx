/**
 * Operation Node Component
 *
 * Displays a calculation operation with recursive children.
 * Supports collapsing and expanding child operations.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { OperationForm } from "./operation-form";
import {
	getOperatorSymbol,
	OperatorBadge,
	type OperatorType,
} from "./operator-badge";

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

interface OperationNodeProps {
	operation: Operation;
	parentValue: number;
	depth?: number;
	isAuthenticated: boolean;
}

export function OperationNode({
	operation,
	parentValue,
	depth = 0,
	isAuthenticated,
}: OperationNodeProps) {
	const [isExpanded, setIsExpanded] = useState(true);
	const [isReplying, setIsReplying] = useState(false);
	const hasChildren = operation.children.length > 0;

	return (
		<div className="relative">
			{/* Connector line */}
			<div className="absolute top-0 -left-4 h-5 w-4 border-muted-foreground/20 border-b-2 border-l-2" />

			<div className="group flex items-center gap-2 py-1">
				{/* Collapse/Expand button */}
				{hasChildren ? (
					<button
						type="button"
						onClick={() => setIsExpanded(!isExpanded)}
						className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground text-xs hover:bg-muted"
					>
						{isExpanded ? "\u25bc" : "\u25b6"}
					</button>
				) : (
					<div className="w-5" />
				)}

				{/* Operation display */}
				<OperatorBadge operator={operation.operator} />
				<span className="min-w-12 font-mono text-muted-foreground text-sm tabular-nums">
					{operation.operand}
				</span>
				<span className="text-muted-foreground">=</span>
				<span className="min-w-16 font-medium font-mono text-sm tabular-nums">
					{formatNumber(operation.result)}
				</span>

				{/* Calculation preview */}
				<span className="min-w-24 text-muted-foreground/60 text-xs tabular-nums">
					({parentValue} {getOperatorSymbol(operation.operator)}{" "}
					{operation.operand})
				</span>

				{/* Author */}
				{operation.username && (
					<span className="text-muted-foreground text-xs">
						by {operation.username}
					</span>
				)}

				{/* Reply button */}
				{isAuthenticated && !isReplying && (
					<Button
						variant="ghost"
						size="xs"
						className="opacity-0 transition-opacity group-hover:opacity-100"
						onClick={() => setIsReplying(true)}
					>
						Reply
					</Button>
				)}
			</div>

			{/* Reply form */}
			{isReplying && (
				<div className="mt-1 mb-2 ml-7">
					<OperationForm
						parentOperationId={operation.id}
						onCancel={() => setIsReplying(false)}
					/>
				</div>
			)}

			{/* Children */}
			{hasChildren && isExpanded && (
				<div className="ml-4 border-muted-foreground/20 border-l-2 pl-4">
					{operation.children.map((child) => (
						<OperationNode
							key={child.id}
							operation={child}
							parentValue={operation.result}
							depth={depth + 1}
							isAuthenticated={isAuthenticated}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function formatNumber(num: number): string {
	// Handle very large or very small numbers with scientific notation
	if (Math.abs(num) > 1e10 || (Math.abs(num) < 1e-6 && num !== 0)) {
		return num.toExponential(4);
	}
	// Round to avoid floating point display issues
	return Number.parseFloat(num.toFixed(10)).toString();
}
