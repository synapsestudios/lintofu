# remote-state-outputs-prefix

Flag a `data.terraform_remote_state` reference that reads an attribute directly, without the `.outputs.` prefix.

## Why

Terraform 0.12 moved remote state outputs behind an `outputs` attribute. Before 0.12, `data.terraform_remote_state.network.vpc_id` read the `vpc_id` output directly. Since 0.12, the same output lives at `data.terraform_remote_state.network.outputs.vpc_id`, and the old form no longer resolves the output. See the [0.12 upgrade guide](https://developer.hashicorp.com/terraform/language/v1.1.x/upgrade-guides/0-12).

## What it flags

```hcl
output "vpc" {
  value = data.terraform_remote_state.network.vpc_id            # flagged
}

resource "aws_instance" "web" {
  subnet_id = "${data.terraform_remote_state.network.subnets[0]}"  # flagged, including inside interpolation
}
```

## What it does not flag

- `data.terraform_remote_state.network.outputs.vpc_id`, the correct form.
- `data.terraform_remote_state.network`, the bare data object with no trailing attribute.
- Any other data source, such as `data.aws_ami.ubuntu.id`.
- A reference whose fourth step is an index rather than an attribute (e.g. `data.terraform_remote_state.network[0]`), which is not the output-access pattern this rule targets.

## Autofix

Fixable. The rule splices the `outputs` step in after the state name, so `data.terraform_remote_state.network.vpc_id` becomes `data.terraform_remote_state.network.outputs.vpc_id`. Trailing attributes and index steps are preserved, and references inside string interpolation are rewritten too.

## Options

None.
