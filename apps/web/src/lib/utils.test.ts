import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn (className utility)", () => {
	it("should merge class names", () => {
		const result = cn("foo", "bar");
		expect(result).toBe("foo bar");
	});

	it("should handle conditional classes", () => {
		const result = cn("base", true && "included", false && "excluded");
		expect(result).toBe("base included");
	});

	it("should handle array of classes", () => {
		const result = cn(["class1", "class2"]);
		expect(result).toBe("class1 class2");
	});

	it("should handle object syntax", () => {
		const result = cn({
			active: true,
			disabled: false,
			hidden: true,
		});
		expect(result).toBe("active hidden");
	});

	it("should merge tailwind classes correctly", () => {
		const result = cn("bg-red-500 p-4", "p-2 text-white");
		// tailwind-merge keeps last conflicting class (p-2) and order may vary
		expect(result).toContain("p-2");
		expect(result).toContain("bg-red-500");
		expect(result).toContain("text-white");
		expect(result).not.toContain("p-4");
	});

	it("should handle undefined and null", () => {
		const result = cn("base", undefined, null, "end");
		expect(result).toBe("base end");
	});

	it("should handle empty string", () => {
		const result = cn("base", "", "end");
		expect(result).toBe("base end");
	});

	it("should handle conflicting tailwind utilities", () => {
		// tailwind-merge should keep the last conflicting class
		const result = cn("text-red-500", "text-blue-500");
		expect(result).toBe("text-blue-500");
	});

	it("should handle spacing conflicts", () => {
		const result = cn("mt-2", "mt-4");
		expect(result).toBe("mt-4");
	});

	it("should preserve non-conflicting classes", () => {
		const result = cn("mt-2 mb-4", "mt-4 text-red-500");
		expect(result).toBe("mb-4 mt-4 text-red-500");
	});
});
