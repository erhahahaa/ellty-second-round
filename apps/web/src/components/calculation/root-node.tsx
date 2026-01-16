/**
 * Root Node Component
 *
 * Displays a calculation root (starting number) with its operation tree.
 * Supports collapsing and expanding the tree.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { OperationForm } from "./operation-form";
import { OperationNode } from "./operation-node";
import type { OperatorType } from "./operator-badge";

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

interface RootNodeProps {
	root: CalculationRoot;
	isAuthenticated: boolean;
}

export function RootNode({ root, isAuthenticated }: RootNodeProps) {
	const [isExpanded, setIsExpanded] = useState(true);
	const [isReplying, setIsReplying] = useState(false);
	const hasOperations = root.operations.length > 0;

	return (
		<Card size="sm">
			<CardHeader className="pb-0">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						{/* Collapse/Expand */}
						{hasOperations && (
							<button
								type="button"
								onClick={() => setIsExpanded(!isExpanded)}
								className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground text-sm hover:bg-muted"
							>
								{isExpanded ? "\u25bc" : "\u25b6"}
							</button>
						)}

						{/* Starting value */}
						<span className="font-bold font-mono text-2xl">
							{formatNumber(root.value)}
						</span>

						{/* Author */}
						{root.username && (
							<span className="text-muted-foreground text-sm">
								started by {root.username}
							</span>
						)}

						{/* Timestamp */}
						<span className="text-muted-foreground/60 text-xs">
							{formatDate(root.createdAt)}
						</span>
					</div>

					{/* Reply button */}
					{isAuthenticated && !isReplying && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsReplying(true)}
						>
							Add Operation
						</Button>
					)}
				</div>

				{/* Reply form */}
				{isReplying && (
					<div className="mt-3">
						<OperationForm
							parentRootId={root.id}
							onCancel={() => setIsReplying(false)}
						/>
					</div>
				)}
			</CardHeader>

			{/* Operations tree */}
			{hasOperations && isExpanded && (
				<CardContent className="pt-4">
					<div className="ml-4 border-muted-foreground/20 border-l-2 pl-2">
						{root.operations.map((operation) => (
							<OperationNode
								key={operation.id}
								operation={operation}
								parentValue={root.value}
								isAuthenticated={isAuthenticated}
							/>
						))}
					</div>
				</CardContent>
			)}

			{/* Empty state */}
			{!hasOperations && (
				<CardContent className="pt-2">
					<p className="text-muted-foreground/60 text-sm">
						No operations yet.{" "}
						{isAuthenticated
							? "Be the first to add one!"
							: "Sign in to add operations."}
					</p>
				</CardContent>
			)}
		</Card>
	);
}

function formatNumber(num: number): string {
	if (Math.abs(num) > 1e10 || (Math.abs(num) < 1e-6 && num !== 0)) {
		return num.toExponential(4);
	}
	return Number.parseFloat(num.toFixed(10)).toString();
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;

	return date.toLocaleDateString();
}
