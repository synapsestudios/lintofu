//go:build js && wasm

package main

import (
	"encoding/json"
	"syscall/js"

	"github.com/synapsestudios/lintofu/parser/parser"
)

func main() {
	js.Global().Set("__lintofu_parse", js.FuncOf(parseFn))
	// Block forever to keep js.FuncOf callbacks alive.
	select {}
}

func parseFn(_ js.Value, args []js.Value) any {
	if len(args) < 2 {
		return marshalErr("expected 2 arguments: source, filename")
	}
	src := []byte(args[0].String())
	filename := args[1].String()

	result := parser.Parse(src, filename)
	data, err := json.Marshal(result)
	if err != nil {
		return marshalErr("marshal failed: " + err.Error())
	}
	return string(data)
}

func marshalErr(msg string) string {
	b, _ := json.Marshal(map[string]string{"__lintofu_error": msg})
	return string(b)
}
