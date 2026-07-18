import type {
  File,
  Language,
  LanguageContext,
  OkParseResult,
  ParseResult,
} from '@eslint/core';
import { dirname, isAbsolute, resolve } from 'node:path';
import { type Body, type Comment, parseSync } from './parser/index.js';
import { OpenTofuSourceCode } from './source-code.js';

/**
 * The eslint Language implementation for opentofu/terraform hcl. The plugin
 * registers it as `lintofu/opentofu`.
 */
export class OpenTofuLanguage implements Language {
  readonly fileType = 'text' as const;
  /** 1-indexed lines. */
  readonly lineStart = 1 as const;
  /** 1-indexed columns. */
  readonly columnStart = 1 as const;
  readonly nodeTypeKey = 'type';

  /**
   * No-op. The Language interface requires this method even when there are
   * no options to validate.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateLanguageOptions(_languageOptions: unknown): void {}

  /**
   * Parses hcl. Parser diagnostics with severity 'error' fail the parse;
   * warnings do not. Comments ride on the parse result's open index
   * signature and are read back in {@link OpenTofuLanguage.createSourceCode};
   * they are not part of the ast.
   */
  parse(file: File, _context: LanguageContext): ParseResult<Body> {
    const text =
      typeof file.body === 'string'
        ? file.body
        : new TextDecoder().decode(file.body);
    const result = parseSync(text, { filename: file.path });

    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    if (errors.length > 0) {
      return {
        ok: false,
        errors: errors.map((d) => ({
          message: d.summary,
          line: d.range.start.line,
          column: d.range.start.column,
          endLine: d.range.end.line,
          endColumn: d.range.end.column,
        })),
      };
    }

    return { ok: true, ast: result.ast, comments: result.comments };
  }

  /**
   * Builds the {@link OpenTofuSourceCode} rules receive as
   * `context.sourceCode`. The module directory is the dirname of the file's
   * physical path, which scopes the project index.
   */
  createSourceCode(
    file: File,
    parseResult: OkParseResult<Body>,
    _context: LanguageContext,
  ): OpenTofuSourceCode {
    const text =
      typeof file.body === 'string'
        ? file.body
        : new TextDecoder().decode(file.body);
    const moduleDir = deriveModuleDir(file.physicalPath);
    const comments = (parseResult.comments as Comment[] | undefined) ?? [];
    return new OpenTofuSourceCode({
      text,
      ast: parseResult.ast,
      comments,
      moduleDir,
    });
  }
}

function deriveModuleDir(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined;
  const abs = isAbsolute(filePath) ? filePath : resolve(filePath);
  return dirname(abs);
}
