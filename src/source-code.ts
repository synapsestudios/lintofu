import type {
  DirectiveType,
  FileProblem,
  SourceLocation,
  SourceRange,
  TraversalStep,
} from '@eslint/core';
import {
  ConfigCommentParser,
  Directive,
  TextSourceCodeBase,
  VisitNodeStep,
} from '@eslint/plugin-kit';
import type { Body, Comment, NodeType, Range } from './parser/types.js';
import { getProjectIndex, type ProjectIndex } from './project-index.js';
import { visitorKeys } from './visitor-keys.js';

const commentParser = new ConfigCommentParser();

// Maps a parsed directive label to its ESLint directive type. A comment is
// only a disable directive if its label is one of these keys.
const DIRECTIVE_TYPES: Record<string, DirectiveType> = {
  'eslint-disable': 'disable',
  'eslint-enable': 'enable',
  'eslint-disable-line': 'disable-line',
  'eslint-disable-next-line': 'disable-next-line',
};

// Strips the comment delimiter so the remaining text is what
// ConfigCommentParser expects: `#` is one char, `//` and `/* */` are two.
function stripDelimiter(comment: Comment): string {
  if (comment.kind === 'block') {
    return comment.value.slice(2, -2);
  }
  return comment.value.startsWith('//')
    ? comment.value.slice(2)
    : comment.value.slice(1);
}

function spansMultipleLines(comment: Comment): boolean {
  return comment.range.start.line !== comment.range.end.line;
}

// Returns the disable-directive details for a comment, or undefined if it is
// not a disable/enable directive. Shared by getDisableDirectives (to build
// directives) and getInlineConfigNodes (to flag them under noInlineConfig).
function parseDisableDirective(
  comment: Comment,
): { type: DirectiveType; value: string; justification: string } | undefined {
  const parsed = commentParser.parseDirective(stripDelimiter(comment));
  if (!parsed) return undefined;
  const type = DIRECTIVE_TYPES[parsed.label];
  if (!type) return undefined;
  return { type, value: parsed.value, justification: parsed.justification };
}

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
  ConfigNode: Comment;
}

export class OpenTofuSourceCode extends TextSourceCodeBase<TofuSourceCodeOptions> {
  readonly #moduleDir: string | undefined;
  readonly comments: Comment[];
  #cachedServices: TofuParserServices | undefined;

  constructor({
    text,
    ast,
    comments = [],
    moduleDir,
  }: {
    text: string;
    ast: Body;
    comments?: Comment[];
    moduleDir?: string;
  }) {
    super({ text, ast });
    this.comments = comments;
    this.#moduleDir = moduleDir;
  }

  getDisableDirectives(): {
    directives: Directive[];
    problems: FileProblem[];
  } {
    const directives: Directive[] = [];
    const problems: FileProblem[] = [];

    for (const comment of this.comments) {
      const directive = parseDisableDirective(comment);
      if (!directive) continue;
      const { type, value, justification } = directive;

      if (type === 'disable-line' && spansMultipleLines(comment)) {
        problems.push({
          ruleId: null,
          message:
            'eslint-disable-line comment should not span multiple lines.',
          loc: this.getLoc(comment),
        });
        continue;
      }

      directives.push(
        new Directive({ type, node: comment, value, justification }),
      );
    }

    return { directives, problems };
  }

  getInlineConfigNodes(): Comment[] {
    return this.comments.filter((c) => parseDisableDirective(c) !== undefined);
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
