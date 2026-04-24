import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initialize, parseSync } from "./parser/index.js";
import type { Attribute, ScopeTraversalExpr } from "./parser/types.js";
import { getProjectIndex } from "./project-index.js";

function parseTraversalAttribute(source: string): ScopeTraversalExpr {
	const result = parseSync(source, { filename: "inline.tf" });
	const block = result.ast.blocks[0];
	if (!block) throw new Error("expected a block");
	const attr = block.body.attributes[0] as Attribute | undefined;
	if (!attr) throw new Error("expected an attribute");
	if (attr.expression.type !== "ScopeTraversalExpr") {
		throw new Error(
			`expected ScopeTraversalExpr, got ${attr.expression.type}`,
		);
	}
	return attr.expression;
}

beforeAll(async () => {
	await initialize();
});

let dir: string;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "lintofu-index-"));
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

describe("projectIndex.findResource", () => {
	it("returns the Block for a resource defined in the module directory", () => {
		writeFileSync(
			join(dir, "main.tf"),
			`resource "aws_security_group" "foo" {
  name = "foo"
}`,
		);

		const index = getProjectIndex(dir);
		const block = index.findResource({
			kind: "resource",
			labels: ["aws_security_group", "foo"],
		});

		expect(block).toBeDefined();
		expect(block?.kind).toBe("resource");
		expect(block?.labels).toEqual(["aws_security_group", "foo"]);
	});

	it("spans every .tf and .tofu file in the module directory", () => {
		writeFileSync(
			join(dir, "a.tf"),
			`resource "aws_security_group" "foo" {}`,
		);
		writeFileSync(
			join(dir, "b.tofu"),
			`resource "aws_security_group" "bar" {}`,
		);

		const index = getProjectIndex(dir);

		expect(
			index.findResource({
				kind: "resource",
				labels: ["aws_security_group", "foo"],
			}),
		).toBeDefined();
		expect(
			index.findResource({
				kind: "resource",
				labels: ["aws_security_group", "bar"],
			}),
		).toBeDefined();
	});

	it("does not include resources from subdirectories", () => {
		writeFileSync(
			join(dir, "root.tf"),
			`resource "aws_security_group" "foo" {}`,
		);
		const nested = join(dir, "nested");
		mkdirSync(nested);
		writeFileSync(
			join(nested, "child.tf"),
			`resource "aws_security_group" "qux" {}`,
		);

		const index = getProjectIndex(dir);

		expect(
			index.findResource({
				kind: "resource",
				labels: ["aws_security_group", "qux"],
			}),
		).toBeUndefined();
	});

	it("returns undefined when the address is not defined", () => {
		writeFileSync(
			join(dir, "main.tf"),
			`resource "aws_security_group" "foo" {}`,
		);

		const index = getProjectIndex(dir);
		expect(
			index.findResource({
				kind: "resource",
				labels: ["aws_security_group", "missing"],
			}),
		).toBeUndefined();
	});
});

describe("projectIndex.resolveTraversal", () => {
	it("resolves `aws_security_group.foo.id` to the defining Block", () => {
		writeFileSync(
			join(dir, "main.tf"),
			`resource "aws_security_group" "foo" {}`,
		);

		const traversal = parseTraversalAttribute(
			`resource "_" "_" { ref = aws_security_group.foo.id }`,
		);
		const index = getProjectIndex(dir);
		const block = index.resolveTraversal(traversal);

		expect(block?.kind).toBe("resource");
		expect(block?.labels).toEqual(["aws_security_group", "foo"]);
	});

	it("reflects file content changes on subsequent builds", () => {
		const path = join(dir, "main.tf");
		writeFileSync(path, `resource "aws_security_group" "before" {}`);

		const first = getProjectIndex(dir);
		expect(
			first.findResource({
				kind: "resource",
				labels: ["aws_security_group", "before"],
			}),
		).toBeDefined();

		writeFileSync(path, `resource "aws_security_group" "after" {}`);
		// Advance mtime explicitly so callers depending on mtime-based caches
		// see the change even when the edit lands within a single fs tick.
		const future = new Date(Date.now() + 2000);
		utimesSync(path, future, future);

		const second = getProjectIndex(dir);
		expect(
			second.findResource({
				kind: "resource",
				labels: ["aws_security_group", "before"],
			}),
		).toBeUndefined();
		expect(
			second.findResource({
				kind: "resource",
				labels: ["aws_security_group", "after"],
			}),
		).toBeDefined();
	});

	it("returns undefined for traversals that don't name a defined resource", () => {
		writeFileSync(
			join(dir, "main.tf"),
			`resource "aws_security_group" "foo" {}`,
		);
		const index = getProjectIndex(dir);

		const missing = parseTraversalAttribute(
			`resource "_" "_" { ref = aws_security_group.gone.id }`,
		);
		expect(index.resolveTraversal(missing)).toBeUndefined();

		const varRef = parseTraversalAttribute(
			`resource "_" "_" { ref = var.something }`,
		);
		expect(index.resolveTraversal(varRef)).toBeUndefined();
	});
});

