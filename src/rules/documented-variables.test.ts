import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import plugin from "../index.js";
import { initialize } from "../parser/index.js";
import rule from "./documented-variables.js";

// RuleTester auto-detects mocha globals; without these it silently no-ops
// under vitest.
RuleTester.describe = describe as unknown as typeof RuleTester.describe;
RuleTester.it = it as unknown as typeof RuleTester.it;

await initialize();

const tester = new RuleTester({
	plugins: { opentofu: plugin },
	language: "opentofu/opentofu",
});

tester.run("documented-variables", rule, {
	valid: [
		{ code: 'variable "region" { description = "AWS region to deploy to" }' },
		{ code: 'output "bucket_arn" { value = aws_s3_bucket.b.arn }' },
		{ code: 'resource "aws_s3_bucket" "b" { bucket = "x" }' },
		{ code: 'variable "region" { description = "region ${var.suffix}" }' },
	],
	invalid: [
		{
			code: 'variable "region" {}',
			errors: [{ messageId: "missingDescription" }],
		},
		{
			code: 'variable "region" { description = "" }',
			errors: [{ messageId: "missingDescription" }],
		},
		{
			code: 'variable "region" { description = "   " }',
			errors: [{ messageId: "missingDescription" }],
		},
		{
			// Doubled backslashes so JS hands HCL the literal `\t\n` escape
			// sequences (not raw control chars, which HCL rejects).
			code: 'variable "region" { description = "\\t\\n  " }',
			errors: [{ messageId: "missingDescription" }],
		},
	],
});
