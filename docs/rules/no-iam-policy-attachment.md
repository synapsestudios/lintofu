# no-iam-policy-attachment

Flag `aws_iam_policy_attachment`, which manages a managed policy's attachments exclusively across the whole AWS account. Prefer the non-exclusive per-principal attachment resources, or the `*_policy_attachments_exclusive` resources when exclusive management is intended.

## Why

The opentofu/aws provider docs for [`aws_iam_policy_attachment`](https://api.opentofu.org/registry/docs/providers/opentofu/aws/v6.42.0/resources/iam_policy_attachment.md) carry this warning:

> The `aws_iam_policy_attachment` resource creates **exclusive** attachments of IAM policies. Across the entire AWS account, all of the users/roles/groups to which a single policy is attached must be declared by a single `aws_iam_policy_attachment` resource. This means that even any users/roles/groups that have the attached policy via any other mechanism (including other Terraform resources) will have that attached policy revoked by this resource. Consider `aws_iam_role_policy_attachment`, `aws_iam_user_policy_attachment`, or `aws_iam_group_policy_attachment` instead. These resources do not enforce exclusive attachment of an IAM policy.

`aws_iam_policy_attachment` keys exclusivity per policy across the entire account: every user, role, and group the policy attaches to must be declared by that one resource. Any principal that receives the policy through another mechanism has its attachment revoked on the next apply. This makes it easy to silently detach principals managed elsewhere.

## What it flags

```hcl
resource "aws_iam_policy_attachment" "attach" {   # account-wide exclusive attachment
  name       = "attach"
  policy_arn = aws_iam_policy.example.arn
  roles      = [aws_iam_role.example.name]
}
```

Accepted:

```hcl
resource "aws_iam_role_policy_attachment" "attach" {   # non-exclusive, per principal
  role       = aws_iam_role.example.name
  policy_arn = aws_iam_policy.example.arn
}

resource "aws_iam_user_policy_attachment" "attach" {   # non-exclusive, per principal
  user       = aws_iam_user.example.name
  policy_arn = aws_iam_policy.example.arn
}

resource "aws_iam_group_policy_attachment" "attach" {  # non-exclusive, per principal
  group      = aws_iam_group.example.name
  policy_arn = aws_iam_policy.example.arn
}

resource "aws_iam_role_policy_attachments_exclusive" "exclusive" {  # exclusive per principal
  role_name   = aws_iam_role.example.name
  policy_arns = [aws_iam_policy.example.arn]
}
```

Pick the replacement by intent. The non-exclusive `aws_iam_role_policy_attachment` / `aws_iam_user_policy_attachment` / `aws_iam_group_policy_attachment` resources attach a policy to a single principal without touching that principal's other attachments. When exclusive management is intended, `aws_iam_role_policy_attachments_exclusive` (and its `_user_` / `_group_` counterparts) scopes exclusivity to one principal. It removes any managed policy the principal is not listed for, and its exclusivity stays local to that principal across the account.

## Autofix

None. The safe replacement depends on whether exclusive management is intended, so the migration cannot be applied automatically.

## Options

None.

## References

- [`aws_iam_policy_attachment`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy_attachment)
- [`aws_iam_role_policy_attachments_exclusive`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachments_exclusive)
