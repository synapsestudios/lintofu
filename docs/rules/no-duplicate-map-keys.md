# no-duplicate-map-keys

Flag a repeated statically-known key inside a single object literal, such as `{ a = 1, a = 2 }`.

## Why

HCL keeps only the last entry for a duplicated map key and silently discards the earlier ones. There is no diagnostic from `tofu validate` or `tofu plan`, so a dropped entry stays invisible until it changes runtime behavior. HashiCorp documented the security impact in [HCSEC-2023-26](https://discuss.hashicorp.com/t/hcsec-2023-26-terraform-s-handling-of-duplicate-map-keys-in-configurations-may-have-security-implications/57613): a duplicate can silently drop a setting such as an IAM policy condition, widening access beyond intent. The last-wins merge is defined in the [HCL native syntax spec](https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md).

## What it flags

A key that appears more than once in the same object literal, reported on every occurrence after the first:

```hcl
locals {
  x = { a = 1, a = 2 }        # second `a` flagged
}
```

Literal, bare-identifier, and single-part template keys share one namespace, so a quoted key collides with a bare one:

```hcl
locals {
  x = { a = 1, "a" = 2 }      # second `a` flagged
}
```

## What it does not flag

- Computed keys whose value resolves at runtime, such as a bare traversal `(local.k)`, a function call, a multi-part or interpolated template, or a conditional. Their equality cannot be proven at lint time.

```hcl
locals {
  m = { (local.k) = 1, (local.k) = 2 }   # not flagged
}
```

- The same name at different nesting levels. Each object literal is its own scope:

```hcl
locals {
  x = { a = { a = 1 }, b = 2 }           # not flagged
}
```

## Autofix

None. Dropping an entry could change intended behavior, so the rule reports without a fix and leaves the choice of which entry to keep to you.

## Options

None.
