# no-iam-role-inline-policies

Flag the deprecated inline `inline_policy` blocks and the `managed_policy_arns` argument on `aws_iam_role`. Prefer standalone `aws_iam_role_policy` and `aws_iam_role_policy_attachment` resources.

## Why

Managing policies inside the `aws_iam_role` resource makes the role claim exclusive ownership of them. Any inline policy or managed-policy attachment added out of band (another module, the console, another team) is silently detached on the next apply. An empty `managed_policy_arns = []` is the extreme case: it detaches every managed policy from the role.

Both arguments are deprecated by the opentofu/aws provider in favor of the standalone resources, which attach policies additively without asserting exclusive ownership. A `dynamic "inline_policy"` block is the same argument generated in a loop, so it carries the same problem.

## What it flags

```hcl
resource "aws_iam_role" "example" {
  name = "example"

  inline_policy {                                  # inline policy
    name   = "inline"
    policy = jsonencode({})
  }

  dynamic "inline_policy" {                        # dynamic inline policy
    for_each = var.policies
    content {
      name   = inline_policy.value.name
      policy = inline_policy.value.policy
    }
  }

  managed_policy_arns = []                          # managed_policy_arns, empty list detaches all
}
```

## Accepted

```hcl
resource "aws_iam_role" "example" {                # role with no inline policies
  name               = "example"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy" "example" {          # standalone inline policy
  name   = "example"
  role   = aws_iam_role.example.id
  policy = jsonencode({})
}

resource "aws_iam_role_policy_attachment" "example" {  # standalone attachment
  role       = aws_iam_role.example.name
  policy_arn = aws_iam_policy.example.arn
}
```

When exclusive management is genuinely intended, use `aws_iam_role_policies_exclusive` (for inline policies) or `aws_iam_role_policy_attachments_exclusive` (for managed-policy attachments), which state that intent explicitly as their own resources.

## Autofix

None. Migrating to the standalone resources means introducing new resources and moving the existing policies with `terraform state mv`, which is beyond a safe mechanical rewrite.

## Options

None.
