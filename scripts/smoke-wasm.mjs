// TODO(#12): include this file in eslint coverage; currently caught by the
// `**/*.mjs` ignore in eslint.config.mjs.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

require(join(repoRoot, 'src/parser/wasm-exec.cjs'));

const wasm = await readFile(join(repoRoot, 'src/parser/lintofu-parser.wasm'));
// @ts-expect-error — globalThis.Go is installed by wasm-exec.cjs.
const go = new globalThis.Go();
const { instance } = await WebAssembly.instantiate(wasm, go.importObject);
// Don't await — go.run resolves only when Go exits, which never happens.
go.run(instance);

const raw = globalThis.__lintofu_parse(
  'variable "region" { description = "AWS region" }',
  'smoke.tf',
);
const result = JSON.parse(raw);

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
};

assert(result.ast, 'result has ast');
assert(result.ast.type === 'Body', 'ast.type is Body');
assert(Array.isArray(result.ast.blocks), 'ast.blocks is array');
assert(result.ast.blocks.length === 1, 'one block');
assert(result.ast.blocks[0].kind === 'variable', 'block.kind is variable');
assert(
  result.ast.blocks[0].labels[0] === 'region',
  'block.labels[0] is "region"',
);
assert(
  result.ast.blocks[0].body.attributes.length === 1,
  'one nested attribute',
);
assert(
  result.ast.blocks[0].body.attributes[0].name === 'description',
  'attribute is "description"',
);
assert(result.diagnostics.length === 0, 'no diagnostics');

console.log('smoke test passed');
process.exit(0);
