package parser

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/zclconf/go-cty/cty"
)

func TestKindRenameAndDiscriminators(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`resource "aws_s3_bucket" "x" { bucket = "b" }`), "t.tf")
	if len(result.Diagnostics) != 0 {
		t.Fatalf("unexpected diagnostics: %+v", result.Diagnostics)
	}

	if result.AST.Type != "Body" {
		t.Errorf("AST.Type = %q, want \"Body\"", result.AST.Type)
	}
	block := result.AST.Blocks[0]
	if block.Type != "Block" {
		t.Errorf("Block.Type = %q, want \"Block\"", block.Type)
	}
	if block.Kind != "resource" {
		t.Errorf("Block.Kind = %q, want \"resource\"", block.Kind)
	}
	if block.Body.Attributes[0].Type != "Attribute" {
		t.Errorf("Attribute.Type = %q", block.Body.Attributes[0].Type)
	}
}

func TestAttributeSortByByte(t *testing.T) {
	t.Parallel()
	src := `variable "x" {
  description = "d"
  type        = string
  default     = "foo"
}`
	result := Parse([]byte(src), "t.tf")
	got := make([]string, 0, len(result.AST.Blocks[0].Body.Attributes))
	for _, a := range result.AST.Blocks[0].Body.Attributes {
		got = append(got, a.Name)
	}
	want := []string{"description", "type", "default"}
	if len(got) != len(want) {
		t.Fatalf("got %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("attr[%d] = %q, want %q (full: %v)", i, got[i], want[i], got)
		}
	}
}

func TestRangeExposesByteOffset(t *testing.T) {
	t.Parallel()
	src := `variable "x" {}`
	result := Parse([]byte(src), "t.tf")
	block := result.AST.Blocks[0]
	if block.Range.Start.Offset != 0 {
		t.Errorf("Start.Offset = %d, want 0", block.Range.Start.Offset)
	}
	if block.Range.End.Offset != len(src) {
		t.Errorf("End.Offset = %d, want %d", block.Range.End.Offset, len(src))
	}
}

func TestCtyToGoPrimitives(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name string
		in   cty.Value
		want any
	}{
		{"string", cty.StringVal("hello"), "hello"},
		{"number", cty.NumberIntVal(42), float64(42)},
		{"bool true", cty.True, true},
		{"bool false", cty.False, false},
		{"null", cty.NullVal(cty.String), nil},
		{"non-primitive returns nil", cty.TupleVal([]cty.Value{cty.NumberIntVal(1)}), nil},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := ctyToGo(tc.in); got != tc.want {
				t.Errorf("got %v (%T), want %v (%T)", got, got, tc.want, tc.want)
			}
		})
	}
}

func TestUnknownExprFallback(t *testing.T) {
	t.Parallel()
	// upper(...) is FunctionCallExpr — currently unhandled by convertExpression.
	result := Parse([]byte(`locals { x = upper("foo") }`), "t.tf")
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	unknown, ok := expr.(*UnknownExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *UnknownExpr", expr)
	}
	if unknown.Type != "UnknownExpr" {
		t.Errorf("Type = %q", unknown.Type)
	}
	if !strings.Contains(unknown.UnknownKind, "FunctionCallExpr") {
		t.Errorf("UnknownKind = %q, want it to contain \"FunctionCallExpr\"", unknown.UnknownKind)
	}
}

func TestDiagnosticFlatten(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`variable "x" {`), "t.tf")
	if len(result.Diagnostics) == 0 {
		t.Fatal("expected diagnostics on unclosed block")
	}
	d := result.Diagnostics[0]
	if d.Severity != "error" {
		t.Errorf("Severity = %q, want \"error\"", d.Severity)
	}
	if d.Summary == "" {
		t.Error("Summary is empty")
	}
	if d.Range.Start.Line == 0 {
		t.Errorf("Range.Start.Line = 0, want 1-indexed")
	}
}

func TestParseAlwaysReturnsNonNilAST(t *testing.T) {
	t.Parallel()
	for _, src := range []string{"", "{{{{", `variable "x" {`} {
		result := Parse([]byte(src), "t.tf")
		if result.AST == nil {
			t.Errorf("AST is nil for input %q", src)
			continue
		}
		if result.AST.Type != "Body" {
			t.Errorf("AST.Type = %q for input %q", result.AST.Type, src)
		}
		// Slices must be non-nil so JSON encodes [] rather than null.
		if result.AST.Blocks == nil {
			t.Errorf("AST.Blocks is nil for input %q", src)
		}
		if result.AST.Attributes == nil {
			t.Errorf("AST.Attributes is nil for input %q", src)
		}
	}
}

func TestJSONRoundTrip(t *testing.T) {
	t.Parallel()
	src := `variable "region" {
  description = "AWS region"
  type        = string
}
locals {
  obj  = { version = "1.0" }
  ref  = var.region
  wrap = "${var.region}"
}`
	result := Parse([]byte(src), "t.tf")
	if len(result.Diagnostics) != 0 {
		t.Fatalf("unexpected diagnostics: %+v", result.Diagnostics)
	}
	b, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	var back map[string]any
	if err := json.Unmarshal(b, &back); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if _, ok := back["ast"].(map[string]any); !ok {
		t.Errorf("ast missing from round-tripped JSON: %s", b)
	}
	if _, ok := back["diagnostics"].([]any); !ok {
		t.Errorf("diagnostics missing/wrong type in round-tripped JSON: %s", b)
	}
}
