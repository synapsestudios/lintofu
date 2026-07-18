# no-api-gateway-deployment-stage-args

Flag the `stage_name`, `stage_description`, and `canary_settings` arguments on a `resource "aws_api_gateway_deployment"` block. The AWS provider removed all three in v6.0.0, so they now fail `tofu validate` and `tofu plan` on every 6.x provider. Manage the stage with a separate `aws_api_gateway_stage` resource.

## Why

`aws_api_gateway_deployment` previously let you create and configure a stage inline through `stage_name`, `stage_description`, and the `canary_settings` block. The AWS provider removed those arguments in v6.0.0, so any config that still sets them errors out on validate and plan once the provider is on 6.x. Move stage management to a dedicated `aws_api_gateway_stage` resource that references the deployment, and import the existing stage so the provider does not try to recreate it. See the [AWS provider v6 upgrade guide](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-6-upgrade) and the [`aws_api_gateway_deployment` resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment).

## What it flags

A `stage_name`, `stage_description`, or `canary_settings` argument inside a `resource "aws_api_gateway_deployment"` block. `canary_settings` is flagged whether it is written as an object attribute or as a nested block:

```hcl
resource "aws_api_gateway_deployment" "this" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  stage_name  = "prod"        # removed in provider v6, flagged

  canary_settings {           # removed in provider v6, flagged
    percent_traffic = 10
  }
}
```

## What it does not flag

- `data "aws_api_gateway_deployment"` blocks. Only the `resource` form is checked.
- `stage_name`, `stage_description`, or `canary_settings` on other resources such as `aws_api_gateway_stage`, where these arguments remain valid:

```hcl
resource "aws_api_gateway_stage" "this" {
  stage_name = "prod"
}
```

## Autofix

None. Migration adds a new `aws_api_gateway_stage` resource and imports the existing stage, which is beyond what a text fixer can do safely.

## Options

None.
