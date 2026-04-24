#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

GOROOT="$(go env GOROOT)"
WASM_EXEC_SRC="${GOROOT}/lib/wasm/wasm_exec.js"

if [[ ! -f "${WASM_EXEC_SRC}" ]]; then
	echo "error: wasm_exec.js not found at ${WASM_EXEC_SRC}" >&2
	exit 1
fi

mkdir -p dist src/parser

# wasm_exec.js may be installed read-only (e.g. Nix); force-replace.
rm -f src/parser/wasm-exec.cjs
cp "${WASM_EXEC_SRC}" src/parser/wasm-exec.cjs
chmod u+w src/parser/wasm-exec.cjs

(
	cd parser-go
	GOOS=js GOARCH=wasm go build -o ../src/parser/lintofu-parser.wasm .
)

echo "built: src/parser/lintofu-parser.wasm ($(wc -c < src/parser/lintofu-parser.wasm) bytes)"
echo "synced: src/parser/wasm-exec.cjs"
