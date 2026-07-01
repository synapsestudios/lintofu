import type { Block } from '../../parser/types.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import { findAttribute, literalStringValue } from '../utils.js';

const MIN_AUTO_UPGRADE_REDIS_MAJOR = 6;

const TARGETS: Record<string, { engineGate?: (block: Block) => boolean }> = {
  aws_db_instance: {},
  aws_rds_cluster_instance: {},
  aws_memorydb_cluster: {},
  aws_mq_broker: {},
  aws_elasticache_cluster: { engineGate: elasticacheAutoUpgradeApplies },
  aws_elasticache_replication_group: {
    engineGate: elasticacheAutoUpgradeApplies,
  },
};

const rule: OpenTofuRuleDefinition<{
  MessageIds: 'pinnedMinorWithAutoUpgrade';
}> = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag AWS engine resources that pin a minor `engine_version` while `auto_minor_version_upgrade` is enabled; the auto-bumped minor drifts from config on every plan.',
      recommended: true,
      severity: 'warn',
      category: 'aws',
    },
    messages: {
      pinnedMinorWithAutoUpgrade:
        '`engine_version` pins a minor version while `auto_minor_version_upgrade` is enabled; the engine will auto-upgrade the minor and every subsequent plan will want to revert it. Drop the minor from `engine_version` (e.g. use `"15"`) or set `auto_minor_version_upgrade = false`. See https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.Upgrading.html#USER_UpgradeDBInstance.Upgrading.AutoMinorVersionUpgrades',
    },
    schema: [],
  },
  create(context) {
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        const kind = node.labels[0];
        if (!kind) return;
        const target = TARGETS[kind];
        if (!target) return;

        if (target.engineGate && !target.engineGate(node)) return;
        if (!autoUpgradeEnabled(node)) return;

        const versionAttr = findAttribute(
          node.body.attributes,
          'engine_version',
        );
        if (!versionAttr) return;
        const version = literalStringValue(versionAttr.expression);
        if (version === undefined) return;
        if (!pinsMinorVersion(version)) return;

        context.report({
          node: versionAttr,
          messageId: 'pinnedMinorWithAutoUpgrade',
        });
      },
    };
  },
};

export default rule;

function autoUpgradeEnabled(block: Block): boolean {
  const attr = findAttribute(
    block.body.attributes,
    'auto_minor_version_upgrade',
  );
  if (!attr) return true;
  const expr = attr.expression;
  if (expr.type !== 'LiteralValueExpr') return false;
  return expr.value !== false;
}

function pinsMinorVersion(version: string): boolean {
  const segments = version.split('.');
  if (!segments.every((s) => /^\d+$/.test(s))) return false;
  return segments.length >= 2;
}

function elasticacheAutoUpgradeApplies(block: Block): boolean {
  const engineAttr = findAttribute(block.body.attributes, 'engine');
  const engine = engineAttr
    ? literalStringValue(engineAttr.expression)
    : 'redis';
  if (engine !== 'redis' && engine !== 'valkey') return false;

  const versionAttr = findAttribute(block.body.attributes, 'engine_version');
  if (!versionAttr) return false;
  const version = literalStringValue(versionAttr.expression);
  if (version === undefined) return false;
  const major = Number(version.split('.')[0]);
  return Number.isInteger(major) && major >= MIN_AUTO_UPGRADE_REDIS_MAJOR;
}
