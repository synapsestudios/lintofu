import type { Block } from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import {
  findAttribute,
  literalStringValue,
  objectItemKeyName,
} from '../core/utils.js';
import { entitlesCountryBlock, readCloudflarePlan } from './utils.js';

function literalAttributeValue(block: Block, name: string): string | undefined {
  const attr = findAttribute(block.body.attributes, name);
  return attr ? literalStringValue(attr.expression) : undefined;
}

function configurationTarget(block: Block): string | undefined {
  const attr = findAttribute(block.body.attributes, 'configuration');
  if (attr?.expression.type !== 'ObjectConsExpr') return undefined;
  const target = attr.expression.items.find(
    (item) => objectItemKeyName(item) === 'target',
  );
  return target ? literalStringValue(target.valueExpr) : undefined;
}

function blocksByCountry(block: Block): boolean {
  return (
    literalAttributeValue(block, 'mode') === 'block' &&
    configurationTarget(block) === 'country'
  );
}

const rule: OpenTofuRuleDefinition<{
  MessageIds: 'countryBlockRequiresEnterprise';
}> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag a `cloudflare_access_rule` that blocks by country while `settings.lintofu.cloudflare.plan` is below Enterprise, the only plan Cloudflare allows it on.',
      recommended: true,
      severity: 'error',
      category: 'cloudflare',
    },
    messages: {
      countryBlockRequiresEnterprise:
        'Blocking by country in a Cloudflare IP Access rule requires the Enterprise plan. The configured plan is "{{plan}}", so this resource fails at apply.',
    },
    schema: [],
  },
  create(context) {
    const setting = readCloudflarePlan(context.settings);
    if (setting.state !== 'valid' || entitlesCountryBlock(setting.plan)) {
      return {};
    }
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.labels[0] !== 'cloudflare_access_rule') return;
        if (!blocksByCountry(node)) return;
        context.report({
          node,
          messageId: 'countryBlockRequiresEnterprise',
          data: { plan: setting.plan },
        });
      },
    };
  },
};

export default rule;
