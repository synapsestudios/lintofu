import type {
	File,
	Language,
	LanguageContext,
	OkParseResult,
	ParseResult,
} from "@eslint/core";
import { type Body, parseSync } from "./parser/index.js";
import { OpenTofuSourceCode } from "./source-code.js";

export class OpenTofuLanguage implements Language {
	readonly fileType = "text" as const;
	readonly lineStart = 1 as const;
	readonly columnStart = 1 as const;
	readonly nodeTypeKey = "type";

	validateLanguageOptions(_languageOptions: unknown): void {}

	parse(file: File, _context: LanguageContext): ParseResult<Body> {
		const text =
			typeof file.body === "string"
				? file.body
				: new TextDecoder().decode(file.body);
		const result = parseSync(text, { filename: file.path });

		const errors = result.diagnostics.filter((d) => d.severity === "error");
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

		return { ok: true, ast: result.ast };
	}

	createSourceCode(
		file: File,
		parseResult: OkParseResult<Body>,
		_context: LanguageContext,
	): OpenTofuSourceCode {
		const text =
			typeof file.body === "string"
				? file.body
				: new TextDecoder().decode(file.body);
		return new OpenTofuSourceCode({ text, ast: parseResult.ast });
	}
}
