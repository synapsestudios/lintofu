import type { Attribute, Block } from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import {
  findAttribute,
  literalStringValue,
  trimNumericVersion,
} from '../core/utils.js';
import { autoMinorUpgradeEnabled, engineName } from './utils.js';

interface Violation {
  node: Attribute;
  safeForm: string;
}

const DB_INSTANCE_SAFE_DEPTH: Record<string, number> = {
  postgres: 1,
  mysql: 2,
  mariadb: 2,
  'db2-ae': 2,
  'db2-se': 2,
};

const POSTGRES_INTEGER_MAJOR_FLOOR = 10;

const ELASTICACHE_AUTO_UPGRADE_MAJOR = 6;

const RESOURCE_HANDLERS: Record<
  string,
  (block: Block) => Violation | undefined
> = {
  aws_db_instance: checkDbInstance,
  aws_elasticache_cluster: checkElastiCache,
  aws_elasticache_replication_group: checkElastiCache,
};

const rule: OpenTofuRuleDefinition<{
  MessageIds: 'pinnedMinorWithAutoUpgrade';
}> = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag AWS engine resources that pin `engine_version` deeper than an enabled `auto_minor_version_upgrade` will hold stable, which drifts on every plan.',
      recommended: true,
      severity: 'warn',
      category: 'aws',
    },
    messages: {
      pinnedMinorWithAutoUpgrade:
        '`engine_version` pins a minor version that `auto_minor_version_upgrade` will move, so every plan drifts. Use `{{safeForm}}`, or set `auto_minor_version_upgrade = false`.',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        const kind = node.labels[0];
        if (!kind) return;
        const handler = RESOURCE_HANDLERS[kind];
        if (!handler) return;
        if (!autoMinorUpgradeEnabled(node)) return;

        const violation = handler(node);
        if (!violation) return;
        context.report({
          node: violation.node,
          messageId: 'pinnedMinorWithAutoUpgrade',
          data: { safeForm: violation.safeForm },
        });
      },
    };
  },
};

export default rule;

function checkDbInstance(block: Block): Violation | undefined {
  const engine = engineName(block);
  if (engine === undefined) return undefined;
  const baseDepth = DB_INSTANCE_SAFE_DEPTH[engine];
  if (baseDepth === undefined) return undefined;

  const versionAttr = findAttribute(block.body.attributes, 'engine_version');
  if (!versionAttr) return undefined;
  const version = literalStringValue(versionAttr.expression);
  if (version === undefined) return undefined;

  const major = version.split('.')[0] ?? '';
  const depth =
    engine === 'postgres' &&
    /^\d+$/.test(major) &&
    Number(major) < POSTGRES_INTEGER_MAJOR_FLOOR
      ? 2
      : baseDepth;

  const safeForm = trimNumericVersion(version, depth);
  if (safeForm === undefined) return undefined;
  return { node: versionAttr, safeForm };
}

function checkElastiCache(block: Block): Violation | undefined {
  const engine = engineName(block) ?? 'redis';
  if (engine !== 'redis' && engine !== 'valkey') return undefined;

  const versionAttr = findAttribute(block.body.attributes, 'engine_version');
  if (!versionAttr) return undefined;
  const version = literalStringValue(versionAttr.expression);
  if (version === undefined) return undefined;

  const parts = version.split('.');
  if (!/^\d+$/.test(parts[0] ?? '')) return undefined;
  if (Number(parts[0]) !== ELASTICACHE_AUTO_UPGRADE_MAJOR) return undefined;
  if (!/^\d+$/.test(parts[1] ?? '')) return undefined;

  return { node: versionAttr, safeForm: '6.x' };
}
