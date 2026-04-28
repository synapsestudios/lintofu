import { describe, expect, it } from "vitest";
import { initialize, parse, parseSync } from "./index.js";

describe("parse", () => {
	it("returns a Body with no blocks or attributes for empty input", async () => {
		const result = await parse("", { filename: "empty.tf" });

		expect(result.ast.type).toBe("Body");
		expect(result.ast.blocks).toEqual([]);
		expect(result.ast.attributes).toEqual([]);
		expect(result.diagnostics).toEqual([]);
	});

	it("handles concurrent calls with a single shared WASM instance", async () => {
		const [r1, r2, r3] = await Promise.all([
			parse('variable "region" {}'),
			parse('output "arn" {}'),
			parse("locals { a = 1 }"),
		]);

		expect(r1.ast.blocks[0]?.kind).toBe("variable");
		expect(r1.ast.blocks[0]?.labels).toEqual(["region"]);
		expect(r2.ast.blocks[0]?.kind).toBe("output");
		expect(r3.ast.blocks[0]?.kind).toBe("locals");
	});

	it("handles repeated sequential calls", async () => {
		for (let i = 0; i < 5; i++) {
			const result = await parse(`variable "v${i}" {}`);
			expect(result.ast.blocks[0]?.labels[0]).toBe(`v${i}`);
		}
	});

	it("reports syntax errors as diagnostics rather than throwing", async () => {
		const result = await parse('variable "x" {', { filename: "bad.tf" });

		expect(result.diagnostics.length).toBeGreaterThan(0);
		const diag = result.diagnostics[0];
		if (!diag) throw new Error("expected at least one diagnostic");
		expect(diag.severity).toBe("error");
		expect(diag.summary.length).toBeGreaterThan(0);
		expect(diag.range.start.line).toBeGreaterThanOrEqual(1);
		expect(result.ast.type).toBe("Body");
	});

	it("exposes a sync parser once initialize() has run", async () => {
		await initialize();
		const result = parseSync('variable "x" {}', { filename: "sync.tf" });
		expect(result.ast.blocks[0]?.kind).toBe("variable");
		expect(result.ast.blocks[0]?.labels[0]).toBe("x");
	});

	it("accepts a filename argument", async () => {
		const result = await parse("variable", { filename: "named.tf" });
		expect(result.diagnostics.length).toBeGreaterThan(0);
	});
});
