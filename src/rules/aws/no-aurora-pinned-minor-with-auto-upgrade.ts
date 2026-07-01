import type { Block } from '../../parser/types.js';
import type { OpenTofuSourceCode } from '../../source-code.js';
import type { OpenTofuRuleDefinition } from '../../types.js';
import {
  autoMinorUpgradeEnabled,
  engineName,
  findAttribute,
  literalStringValue,
  traversalHead,
  trimNumericVersion,
} from '../utils.js';

const CLUSTER_KIND = 'aws_rds_cluster';
const INSTANCE_KIND = 'aws_rds_cluster_instance';

const rule: OpenTofuRuleDefinition<{
  MessageIds: 'pinnedMinorWithAutoUpgrade';
}> = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag an Aurora PostgreSQL cluster that pins `engine_version` deeper than the auto minor upgrade enabled across its instances will hold stable, which drifts on every plan.',
      recommended: true,
      severity: 'warn',
      category: 'aws',
    },
    messages: {
      pinnedMinorWithAutoUpgrade:
        '`engine_version` pins a minor version that `auto_minor_version_upgrade` on this cluster’s instances will move, so every plan drifts. Use `{{safeForm}}`, or set `auto_minor_version_upgrade = false` on an instance.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Block(node) {
        if (node.kind !== 'resource') return;
        if (node.labels[0] !== CLUSTER_KIND) return;
        if (engineName(node) !== 'aurora-postgresql') return;

        const versionAttr = findAttribute(
          node.body.attributes,
          'engine_version',
        );
        if (!versionAttr) return;
        const version = literalStringValue(versionAttr.expression);
        if (version === undefined) return;
        const safeForm = trimNumericVersion(version, 1);
        if (safeForm === undefined) return;

        const instances = clusterInstancesFor(node, sourceCode);
        if (instances.length === 0) return;
        // Aurora only auto-upgrades when every instance opts in, so the pin is
        // safe the moment any instance turns it off.
        if (!instances.every(autoMinorUpgradeEnabled)) return;

        context.report({
          node: versionAttr,
          messageId: 'pinnedMinorWithAutoUpgrade',
          data: { safeForm },
        });
      },
    };
  },
};

export default rule;

function clusterInstancesFor(
  cluster: Block,
  sourceCode: OpenTofuSourceCode,
): Block[] {
  const out: Block[] = [];
  const seen = new Set<string>();
  const collect = (blocks: readonly Block[]) => {
    for (const block of blocks) {
      if (!isInstanceOf(block, cluster)) continue;
      const key = block.labels.join('.');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(block);
    }
  };
  // In-source blocks win over the on-disk index copy of the same resource: the
  // file being linted is authoritative when it differs from what's on disk.
  collect(sourceCode.ast.blocks);
  collect(
    sourceCode.parserServices.projectIndex.resourcesByType(INSTANCE_KIND),
  );
  return out;
}

function isInstanceOf(block: Block, cluster: Block): boolean {
  if (block.kind !== 'resource') return false;
  if (block.labels[0] !== INSTANCE_KIND) return false;
  const attr = findAttribute(block.body.attributes, 'cluster_identifier');
  if (attr?.expression.type !== 'ScopeTraversalExpr') return false;
  const head = traversalHead(attr.expression);
  if (!head) return false;
  return head[0] === cluster.labels[0] && head[1] === cluster.labels[1];
}
