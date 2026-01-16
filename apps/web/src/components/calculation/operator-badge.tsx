/**
 * Operator Badge Component
 *
 * Displays a colored badge for mathematical operators.
 */

import { cn } from "@/lib/utils";

export type OperatorType = "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE";

const operatorSymbols: Record<OperatorType, string> = {
	ADD: "+",
	SUBTRACT: "-",
	MULTIPLY: "\u00d7",
	DIVIDE: "\u00f7",
};

const operatorColors: Record<OperatorType, string> = {
	ADD: "bg-green-500/20 text-green-400 border-green-500/30",
	SUBTRACT: "bg-red-500/20 text-red-400 border-red-500/30",
	MULTIPLY: "bg-blue-500/20 text-blue-400 border-blue-500/30",
	DIVIDE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

interface OperatorBadgeProps {
	operator: OperatorType;
	className?: string;
}

export function OperatorBadge({ operator, className }: OperatorBadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex h-6 w-6 items-center justify-center rounded border font-bold font-mono text-sm",
				operatorColors[operator],
				className,
			)}
		>
			{operatorSymbols[operator]}
		</span>
	);
}

export function getOperatorSymbol(operator: OperatorType): string {
	return operatorSymbols[operator];
}
