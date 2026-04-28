import type { Plugin } from "@eslint/core";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Linter } from "eslint";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import plugin from "../../index.js";
import { initialize } from "../../parser/index.js";

beforeAll(async () => {
	await initialize();
});

let dir: string;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "lintofu-multifile-"));
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

function verify(targetFile: string, moduleDir: string) {
	const linter = new Linter({ cwd: moduleDir });
	const code = readFileSync(targetFile, "utf8");
	return linter.verify(
		code,
		[
			{
				files: ["**/*.tf", "**/*.tofu"],
				plugins: { lintofu: plugin as unknown as Plugin },
				// The `as never` casts bypass flat-config's ESTree-shaped type
				// checks; the actual Language API is validated at runtime.
				language: "lintofu/opentofu" as never,
				rules: { "lintofu/no-mixed-security-group-rule-forms": "warn" },
			} as never,
		],
		{ filename: targetFile },
	);
}

describe("no-mixed-security-group-rule-forms (multi-file)", () => {
	it("warns when the SG is defined in a sibling file with inline blocks", () => {
		writeFileSync(
			join(dir, "sg.tf"),
			`resource "aws_security_group" "foo" {
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`,
		);
		const rulePath = join(dir, "rule.tf");
		writeFileSync(
			rulePath,
			`resource "aws_vpc_security_group_ingress_rule" "r" {
  security_group_id = aws_security_group.foo.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}`,
		);

		const messages = verify(rulePath, dir);

		expect(messages).toHaveLength(1);
		expect(messages[0]?.messageId).toBe("mixedForms");
		expect(messages[0]?.severity).toBe(1);
	});

	it("stays silent when the SG in a sibling file has no inline blocks", () => {
		writeFileSync(
			join(dir, "sg.tf"),
			`resource "aws_security_group" "foo" {
  name = "foo"
}`,
		);
		const rulePath = join(dir, "rule.tf");
		writeFileSync(
			rulePath,
			`resource "aws_vpc_security_group_ingress_rule" "r" {
  security_group_id = aws_security_group.foo.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}`,
		);

		expect(verify(rulePath, dir)).toHaveLength(0);
	});
});
