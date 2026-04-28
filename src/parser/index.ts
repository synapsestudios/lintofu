import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ParseResult } from './types.js';

export type * from './types.js';

interface GoRuntime {
  importObject: WebAssembly.Imports;
  run(instance: WebAssembly.Instance): Promise<void>;
}

interface GoHost {
  Go: new () => GoRuntime;
  __lintofu_parse?: (source: string, filename: string) => string;
}

let bootPromise: Promise<void> | undefined;

async function boot(): Promise<void> {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    const require = createRequire(import.meta.url);
    const here = dirname(fileURLToPath(import.meta.url));

    // wasm-exec.cjs installs globalThis.Go as a side effect.
    require(join(here, 'wasm-exec.cjs'));

    const wasmBytes = await readFile(join(here, 'lintofu-parser.wasm'));
    const host = globalThis as unknown as GoHost;
    const go = new host.Go();
    const { instance } = await WebAssembly.instantiate(
      wasmBytes,
      go.importObject,
    );
    // Don't await: go.run resolves only when Go exits, but our main
    // blocks on select{} so callbacks stay reachable.
    void go.run(instance);
  })();
  return bootPromise;
}

// ESLint's Language.parse contract is sync, so consumers must call
// initialize() (typically as top-level await at plugin load) before any
// parseSync() can succeed.
export async function initialize(): Promise<void> {
  await boot();
}

export function parseSync(
  source: string,
  opts: { filename?: string } = {},
): ParseResult {
  const host = globalThis as unknown as GoHost;
  if (!host.__lintofu_parse) {
    throw new Error(
      'lintofu parser: not initialized. Call initialize() before parseSync().',
    );
  }
  const filename = opts.filename ?? '<anonymous>';
  const raw = host.__lintofu_parse(source, filename);
  return JSON.parse(raw) as ParseResult;
}

export async function parse(
  source: string,
  opts: { filename?: string } = {},
): Promise<ParseResult> {
  await boot();
  return parseSync(source, opts);
}
