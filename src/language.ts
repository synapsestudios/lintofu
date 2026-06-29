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

export class OpenTofuLanguage implements Language {
  readonly fileType = 'text' as const;
  readonly lineStart = 1 as const;
  readonly columnStart = 1 as const;
  readonly nodeTypeKey = 'type';

  // The Language interface requires this method even when there are no
  // options to validate.
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateLanguageOptions(_languageOptions: unknown): void {}

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

    // Comments ride on the parse result's open index signature and are
    // read back in createSourceCode; they are not part of the AST.
    return { ok: true, ast: result.ast, comments: result.comments };
  }

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
