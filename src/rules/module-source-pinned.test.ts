import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import plugin from "../index.js";
import { initialize } from "../parser/index.js";
import rule from "./module-source-pinned.js";

RuleTester.describe = describe as unknown as typeof RuleTester.describe;
RuleTester.it = it as unknown as typeof RuleTester.it;

await initialize();

const tester = new RuleTester({
	plugins: { opentofu: plugin },
	language: "opentofu/opentofu",
});

tester.run("module-source-pinned", rule, {
	valid: [
		{ code: 'module "x" { source = "./modules/foo" }' },
		{ code: 'module "x" { source = "../shared/bar" }' },
		{
			code: 'module "x" { source = "git::https://example.com/repo.git?ref=v1.0.0" }',
		},
		{
			code: 'module "x" {\n  source  = "terraform-aws-modules/vpc/aws"\n  version = "3.0.0"\n}',
		},
		{ code: 'resource "x" "y" { source = "whatever" }' },
		{ code: 'module "x" { source = var.module_source }' },
	],
	invalid: [
		{
			code: 'module "x" { source = "terraform-aws-modules/vpc/aws" }',
			errors: [{ messageId: "unpinnedSource", data: { name: "x" } }],
		},
		{
			code: 'module "x" { source = "git::https://example.com/repo.git" }',
			errors: [{ messageId: "unpinnedSource" }],
		},
	],
});
