import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute, literalStringValue } from '../core/utils.js';

const DEPRECATED: Record<string, string> = {
  'nodejs4.3': 'nodejs22.x',
  'nodejs4.3-edge': 'nodejs22.x',
  'nodejs6.10': 'nodejs22.x',
  'nodejs8.10': 'nodejs22.x',
  'nodejs10.x': 'nodejs22.x',
  'nodejs12.x': 'nodejs22.x',
  'nodejs14.x': 'nodejs22.x',
  'nodejs16.x': 'nodejs22.x',
  'nodejs18.x': 'nodejs22.x',
  'nodejs20.x': 'nodejs22.x',
  'python2.7': 'python3.13',
  'python3.6': 'python3.13',
  'python3.7': 'python3.13',
  'python3.8': 'python3.13',
  'python3.9': 'python3.13',
  'ruby2.5': 'ruby3.3',
  'ruby2.7': 'ruby3.3',
  'ruby3.2': 'ruby3.3',
  java8: 'java21',
  'go1.x': 'provided.al2023',
  'dotnetcore1.0': 'dotnet8',
  'dotnetcore2.0': 'dotnet8',
  'dotnetcore2.1': 'dotnet8',
  'dotnetcore3.1': 'dotnet8',
  'dotnet5.0': 'dotnet8',
  dotnet6: 'dotnet8',
  dotnet7: 'dotnet8',
  provided: 'provided.al2023',
};

const rule: OpenTofuRuleDefinition<{ MessageIds: 'deprecatedRuntime' }> = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag AWS-deprecated Lambda runtime identifiers on `aws_lambda_function` and `aws_lambda_layer_version` and name the nearest supported successor.',
      recommended: true,
      severity: 'warn',
      category: 'aws',
    },
    messages: {
      deprecatedRuntime:
        'The Lambda runtime `{{runtime}}` is deprecated by AWS. Use `{{successor}}` or a later supported runtime.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'resource') return;

        if (node.labels[0] === 'aws_lambda_function') {
          const attr = findAttribute(node.body.attributes, 'runtime');
          if (!attr) return;
          const value = literalStringValue(attr.expression);
          if (value === undefined) return;
          const successor = DEPRECATED[value];
          if (successor === undefined) return;
          context.report({
            node: attr,
            messageId: 'deprecatedRuntime',
            data: { runtime: value, successor },
          });
          return;
        }

        if (node.labels[0] === 'aws_lambda_layer_version') {
          const attr = findAttribute(
            node.body.attributes,
            'compatible_runtimes',
          );
          if (attr?.expression.type !== 'TupleConsExpr') return;
          for (const element of attr.expression.exprs) {
            const value = literalStringValue(element);
            if (value === undefined) continue;
            const successor = DEPRECATED[value];
            if (successor === undefined) continue;
            context.report({
              node: element,
              messageId: 'deprecatedRuntime',
              data: { runtime: value, successor },
            });
          }
        }
      },
    };
  },
};

export default rule;
