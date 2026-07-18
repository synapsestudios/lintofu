# no-deprecated-lambda-runtime

Flag a `runtime` value on `resource "aws_lambda_function"` or a `compatible_runtimes` element on `resource "aws_lambda_layer_version"` that names an AWS-deprecated Lambda runtime. The report names the nearest supported successor.

## Why

AWS retires Lambda runtimes on a published schedule. Once a runtime reaches end of support, you can no longer create functions on it, and after a further phase you can no longer update existing functions. Deploying against a deprecated identifier surfaces late, at apply time or in production, rather than during review. This rule catches the stale identifier in the configuration so you can move to a supported runtime early. See the [AWS Lambda runtimes reference](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html) and the [runtime deprecation policy](https://docs.aws.amazon.com/lambda/latest/dg/runtime-support-policy.html).

## What it flags

A literal `runtime` on an `aws_lambda_function` that matches a deprecated identifier:

```hcl
resource "aws_lambda_function" "f" {
  runtime = "python3.9"        # deprecated, flagged; use python3.13
}
```

A literal `compatible_runtimes` element on an `aws_lambda_layer_version` that matches a deprecated identifier:

```hcl
resource "aws_lambda_layer_version" "l" {
  compatible_runtimes = ["python3.9", "nodejs22.x"]   # only python3.9 is flagged
}
```

Matching is exact-identifier only.

## What it does not flag

- Supported runtimes such as `nodejs22.x`, `python3.13`, `provided.al2023`, and `java8.al2`.
- Non-literal values such as `runtime = var.r`, whose value cannot be resolved at lint time.
- Identifiers that are not in the deprecated table. `provided.al2023`, `provided.al2`, and `java8.al2` are distinct identifiers from `provided` and `java8` and stay valid.
- Any resource other than `aws_lambda_function` and `aws_lambda_layer_version`.

## Autofix

None. The successor is named in the message so you can choose the runtime that fits, since a newer major version can require code changes.

## Options

None.
