import type { SourceLocation, SourceRange, TraversalStep } from '@eslint/core';
import { TextSourceCodeBase, VisitNodeStep } from '@eslint/plugin-kit';
import type { Body, NodeType, Range } from './parser/types.js';
import { getProjectIndex, type ProjectIndex } from './project-index.js';
import { visitorKeys } from './visitor-keys.js';

export interface TofuParserServices {
  projectIndex: ProjectIndex;
}

const EMPTY_INDEX: ProjectIndex = {
  findResource: () => undefined,
  resolveTraversal: () => undefined,
};

// No index signature: it would break structural compatibility with the
// concrete node interfaces (Block, Attribute, ...). Generic walkers cast
// to Record<string, unknown> locally instead.
export interface TofuNode {
  type: string;
  range: Range;
}

interface TofuSourceCodeOptions {
  LangOptions: Record<string, unknown>;
  RootNode: Body;
  SyntaxElementWithLoc: TofuNode;
  ConfigNode: unknown;
}

export class OpenTofuSourceCode extends TextSourceCodeBase<TofuSourceCodeOptions> {
  readonly #moduleDir: string | undefined;
  #cachedServices: TofuParserServices | undefined;

  constructor({
    text,
    ast,
    moduleDir,
  }: {
    text: string;
    ast: Body;
    moduleDir?: string;
  }) {
    super({ text, ast });
    this.#moduleDir = moduleDir;
  }

  get parserServices(): TofuParserServices {
    if (this.#cachedServices) return this.#cachedServices;
    const projectIndex = this.#moduleDir
      ? getProjectIndex(this.#moduleDir)
      : EMPTY_INDEX;
    this.#cachedServices = { projectIndex };
    return this.#cachedServices;
  }

  override getLoc(node: TofuNode): SourceLocation {
    return {
      start: { line: node.range.start.line, column: node.range.start.column },
      end: { line: node.range.end.line, column: node.range.end.column },
    };
  }

  override getRange(node: TofuNode): SourceRange {
    return [node.range.start.offset, node.range.end.offset];
  }

  override *traverse(): Generator<TraversalStep> {
    yield* visitNode(this.ast);
  }
}

function* visitNode(node: TofuNode): Generator<TraversalStep> {
  // args MUST be [node], not []. ESLint's traverser does
  // `step.args ?? [step.target]` — a truthy empty array skips the
  // fallback and the rule visitor receives no arguments.
  yield new VisitNodeStep({ target: node, phase: 1, args: [node] });

  if (node.type === 'ObjectConsExpr') {
    // ObjectConsItem has no `type` discriminator — descend into each
    // pair's keyExpr/valueExpr directly rather than treating items as nodes.
    const items = (
      node as unknown as {
        items: { keyExpr: TofuNode; valueExpr: TofuNode }[];
      }
    ).items;
    for (const item of items) {
      yield* visitNode(item.keyExpr);
      yield* visitNode(item.valueExpr);
    }
  } else {
    const keys = visitorKeys[node.type as NodeType];
    const indexed = node as unknown as Record<string, unknown>;
    for (const key of keys) {
      const child = indexed[key];
      if (Array.isArray(child)) {
        for (const c of child) {
          if (isTofuNode(c)) yield* visitNode(c);
        }
      } else if (isTofuNode(child)) {
        yield* visitNode(child);
      }
    }
  }

  yield new VisitNodeStep({ target: node, phase: 2, args: [node] });
}

function isTofuNode(value: unknown): value is TofuNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).type === 'string'
  );
}
