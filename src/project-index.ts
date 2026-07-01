import { type Dirent, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseSync } from './parser/index.js';
import type { Block, ScopeTraversalExpr } from './parser/types.js';

export interface ResourceAddress {
  kind: string;
  labels: string[];
}

export interface ProjectIndex {
  findResource(addr: ResourceAddress): Block | undefined;
  resolveTraversal(expr: ScopeTraversalExpr): Block | undefined;
  resourcesByType(type: string): readonly Block[];
}

interface CachedIndex {
  fingerprint: string;
  index: ProjectIndex;
}

const cache = new Map<string, CachedIndex>();

export function getProjectIndex(moduleDir: string): ProjectIndex {
  const files = listModuleFiles(moduleDir);
  const fingerprint = fingerprintFiles(files);

  const cached = cache.get(moduleDir);
  if (cached?.fingerprint === fingerprint) {
    return cached.index;
  }

  const index = buildIndex(files);
  cache.set(moduleDir, { fingerprint, index });
  return index;
}

interface ModuleFile {
  path: string;
  mtimeMs: number;
}

function listModuleFiles(moduleDir: string): ModuleFile[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(moduleDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: ModuleFile[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.tf') && !entry.name.endsWith('.tofu')) continue;
    const path = join(moduleDir, entry.name);
    out.push({ path, mtimeMs: statSync(path).mtimeMs });
  }
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

function fingerprintFiles(files: ModuleFile[]): string {
  return files.map((f) => `${f.path}@${String(f.mtimeMs)}`).join('|');
}

function buildIndex(files: ModuleFile[]): ProjectIndex {
  const blocksByAddress = new Map<string, Block>();
  const resourcesByType = new Map<string, Block[]>();

  for (const file of files) {
    const text = readFileSync(file.path, 'utf8');
    const result = parseSync(text, { filename: file.path });
    for (const block of result.ast.blocks) {
      blocksByAddress.set(addressKey(block.kind, block.labels), block);
      if (block.kind === 'resource' && block.labels[0] !== undefined) {
        const type = block.labels[0];
        const list = resourcesByType.get(type);
        if (list) list.push(block);
        else resourcesByType.set(type, [block]);
      }
    }
  }

  const index: ProjectIndex = {
    findResource(addr) {
      return blocksByAddress.get(addressKey(addr.kind, addr.labels));
    },
    resolveTraversal(expr) {
      const addr = traversalToResourceAddress(expr);
      if (!addr) return undefined;
      return index.findResource(addr);
    },
    resourcesByType(type) {
      return resourcesByType.get(type) ?? [];
    },
  };
  return index;
}

function addressKey(kind: string, labels: readonly string[]): string {
  return `${kind}::${labels.join('.')}`;
}

function traversalToResourceAddress(
  expr: ScopeTraversalExpr,
): ResourceAddress | undefined {
  const [root, name] = expr.traversal;
  if (root?.type !== 'TraverseRoot') return undefined;
  if (name?.type !== 'TraverseAttr') return undefined;
  return { kind: 'resource', labels: [root.name, name.name] };
}
