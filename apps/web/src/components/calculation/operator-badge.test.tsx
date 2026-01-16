import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	getOperatorSymbol,
	OperatorBadge,
	type OperatorType,
} from "./operator-badge";

describe("OperatorBadge", () => {
	describe("rendering", () => {
		it("should render ADD operator with + symbol", () => {
			render(<OperatorBadge operator="ADD" />);
			expect(screen.getByText("+")).toBeTruthy();
		});

		it("should render SUBTRACT operator with - symbol", () => {
			render(<OperatorBadge operator="SUBTRACT" />);
			expect(screen.getByText("-")).toBeTruthy();
		});

		it("should render MULTIPLY operator with multiplication symbol", () => {
			render(<OperatorBadge operator="MULTIPLY" />);
			expect(screen.getByText("\u00d7")).toBeTruthy();
		});

		it("should render DIVIDE operator with division symbol", () => {
			render(<OperatorBadge operator="DIVIDE" />);
			expect(screen.getByText("\u00f7")).toBeTruthy();
		});
	});

	describe("styling", () => {
		it("should apply green color classes for ADD", () => {
			const { container } = render(<OperatorBadge operator="ADD" />);
			const badge = container.querySelector("span");
			expect(badge?.className).toContain("bg-green-500/20");
			expect(badge?.className).toContain("text-green-400");
		});

		it("should apply red color classes for SUBTRACT", () => {
			const { container } = render(<OperatorBadge operator="SUBTRACT" />);
			const badge = container.querySelector("span");
			expect(badge?.className).toContain("bg-red-500/20");
			expect(badge?.className).toContain("text-red-400");
		});

		it("should apply blue color classes for MULTIPLY", () => {
			const { container } = render(<OperatorBadge operator="MULTIPLY" />);
			const badge = container.querySelector("span");
			expect(badge?.className).toContain("bg-blue-500/20");
			expect(badge?.className).toContain("text-blue-400");
		});

		it("should apply purple color classes for DIVIDE", () => {
			const { container } = render(<OperatorBadge operator="DIVIDE" />);
			const badge = container.querySelector("span");
			expect(badge?.className).toContain("bg-purple-500/20");
			expect(badge?.className).toContain("text-purple-400");
		});

		it("should apply custom className", () => {
			const { container } = render(
				<OperatorBadge operator="ADD" className="custom-class" />,
			);
			const badge = container.querySelector("span");
			expect(badge?.className).toContain("custom-class");
		});

		it("should have consistent base styles", () => {
			const { container } = render(<OperatorBadge operator="ADD" />);
			const badge = container.querySelector("span");
			expect(badge?.className).toContain("inline-flex");
			expect(badge?.className).toContain("items-center");
			expect(badge?.className).toContain("justify-center");
			expect(badge?.className).toContain("rounded");
			expect(badge?.className).toContain("border");
			expect(badge?.className).toContain("font-mono");
		});
	});
});

describe("getOperatorSymbol", () => {
	it.each<[OperatorType, string]>([
		["ADD", "+"],
		["SUBTRACT", "-"],
		["MULTIPLY", "\u00d7"],
		["DIVIDE", "\u00f7"],
	])("should return correct symbol for %s", (operator, expectedSymbol) => {
		expect(getOperatorSymbol(operator)).toBe(expectedSymbol);
	});
});
