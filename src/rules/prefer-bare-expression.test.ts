import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import plugin from "../index.js";
import { initialize } from "../parser/index.js";
import rule from "./prefer-bare-expression.js";

RuleTester.describe = describe as unknown as typeof RuleTester.describe;
RuleTester.it = it as unknown as typeof RuleTester.it;

await initialize();

const tester = new RuleTester({
	plugins: { lintofu: plugin },
	language: "lintofu/opentofu",
});

tester.run("prefer-bare-expression", rule, {
	valid: [
		{ code: 'locals { a = "hello" }' },
		{ code: 'locals { a = "hello ${var.x}" }' },
		{ code: 'locals { a = "${var.x} world" }' },
		{ code: 'locals { a = "${var.x}-${var.y}" }' },
		{ code: "locals { a = var.x }" },
	],
	invalid: [
		{
			code: 'locals { a = "${var.foo}" }',
			errors: [{ messageId: "preferBareExpression" }],
		},
		{
			code: 'locals { a = "${aws_s3_bucket.b.arn}" }',
			errors: [{ messageId: "preferBareExpression" }],
		},
	],
});
