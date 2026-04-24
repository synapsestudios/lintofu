import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import plugin from "../../index.js";
import { initialize } from "../../parser/index.js";
import rule from "./documented-outputs.js";

RuleTester.describe = describe as unknown as typeof RuleTester.describe;
RuleTester.it = it as unknown as typeof RuleTester.it;

await initialize();

const tester = new RuleTester({
	plugins: { lintofu: plugin },
	language: "lintofu/opentofu",
});

tester.run("documented-outputs", rule, {
	valid: [
		{
			code: 'output "arn" {\n  value = "x"\n  description = "Bucket ARN"\n}',
		},
		{ code: 'variable "region" {}' },
		{ code: 'resource "aws_s3_bucket" "b" { bucket = "x" }' },
	],
	invalid: [
		{
			code: 'output "arn" { value = "x" }',
			errors: [{ messageId: "missingDescription" }],
		},
		{
			code: 'output "arn" {\n  value = "x"\n  description = ""\n}',
			errors: [{ messageId: "missingDescription" }],
		},
		{
			code: 'output "arn" {\n  value = "x"\n  description = "   "\n}',
			errors: [{ messageId: "missingDescription" }],
		},
	],
});
