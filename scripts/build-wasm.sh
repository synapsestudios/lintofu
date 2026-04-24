#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

GOROOT="$(go env GOROOT)"

# Go 1.24 moved wasm_exec.js from misc/wasm/ to lib/wasm/. Check both.
WASM_EXEC_SRC=""
for candidate in "${GOROOT}/lib/wasm/wasm_exec.js" "${GOROOT}/misc/wasm/wasm_exec.js"; do
	if [[ -f "${candidate}" ]]; then
		WASM_EXEC_SRC="${candidate}"
		break
	fi
done

if [[ -z "${WASM_EXEC_SRC}" ]]; then
	echo "error: wasm_exec.js not found in GOROOT (${GOROOT})" >&2
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
