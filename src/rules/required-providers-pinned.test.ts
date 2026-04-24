import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import plugin from "../index.js";
import { initialize } from "../parser/index.js";
import rule from "./required-providers-pinned.js";

RuleTester.describe = describe as unknown as typeof RuleTester.describe;
RuleTester.it = it as unknown as typeof RuleTester.it;

await initialize();

const tester = new RuleTester({
	plugins: { opentofu: plugin },
	language: "opentofu/opentofu",
});

tester.run("required-providers-pinned", rule, {
	valid: [
		{
			code: `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}`,
		},
		{ code: "terraform {}" },
		{ code: 'resource "x" "y" { bucket = "b" }' },
	],
	invalid: [
		{
			code: `terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}`,
			errors: [{ messageId: "unpinnedProvider", data: { name: "aws" } }],
		},
		{
			code: `terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    google = {
      source = "hashicorp/google"
    }
  }
}`,
			errors: [
				{ messageId: "unpinnedProvider" },
				{ messageId: "unpinnedProvider" },
			],
		},
	],
});
