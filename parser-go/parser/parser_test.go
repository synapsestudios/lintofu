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
	// [1, 2] is TupleConsExpr, still unhandled by convertExpression.
	result := Parse([]byte(`locals { x = [1, 2] }`), "t.tf")
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	unknown, ok := expr.(*UnknownExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *UnknownExpr", expr)
	}
	if unknown.Type != "UnknownExpr" {
		t.Errorf("Type = %q", unknown.Type)
	}
	if !strings.Contains(unknown.UnknownKind, "TupleConsExpr") {
		t.Errorf("UnknownKind = %q, want it to contain \"TupleConsExpr\"", unknown.UnknownKind)
	}
}

func TestFunctionCallExpr(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`locals { x = format("rm -rf %s", var.path) }`), "t.tf")
	if len(result.Diagnostics) != 0 {
		t.Fatalf("unexpected diagnostics: %+v", result.Diagnostics)
	}
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	call, ok := expr.(*FunctionCallExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *FunctionCallExpr", expr)
	}
	if call.Type != "FunctionCallExpr" {
		t.Errorf("Type = %q", call.Type)
	}
	if call.Name != "format" {
		t.Errorf("Name = %q, want \"format\"", call.Name)
	}
	if len(call.Args) != 2 {
		t.Fatalf("len(Args) = %d, want 2", len(call.Args))
	}
	if _, ok := call.Args[1].(*ScopeTraversalExpr); !ok {
		t.Errorf("Args[1] type = %T, want *ScopeTraversalExpr", call.Args[1])
	}
	if call.ExpandFinal {
		t.Error("ExpandFinal = true, want false")
	}
}

func TestFunctionCallExprExpandFinal(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`locals { x = concat([1], vals...) }`), "t.tf")
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	call, ok := expr.(*FunctionCallExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *FunctionCallExpr", expr)
	}
	if !call.ExpandFinal {
		t.Error("ExpandFinal = false, want true for `vals...` spread")
	}
}

func TestFunctionCallExprNoArgs(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`locals { x = uuid() }`), "t.tf")
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	call, ok := expr.(*FunctionCallExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *FunctionCallExpr", expr)
	}
	if call.Name != "uuid" {
		t.Errorf("Name = %q, want \"uuid\"", call.Name)
	}
	if len(call.Args) != 0 {
		t.Errorf("len(Args) = %d, want 0", len(call.Args))
	}
}

func TestConditionalExpr(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`locals { x = local.cond ? var.a : "b" }`), "t.tf")
	if len(result.Diagnostics) != 0 {
		t.Fatalf("unexpected diagnostics: %+v", result.Diagnostics)
	}
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	cond, ok := expr.(*ConditionalExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *ConditionalExpr", expr)
	}
	if cond.Type != "ConditionalExpr" {
		t.Errorf("Type = %q", cond.Type)
	}
	if _, ok := cond.Condition.(*ScopeTraversalExpr); !ok {
		t.Errorf("Condition type = %T, want *ScopeTraversalExpr", cond.Condition)
	}
	if _, ok := cond.TrueResult.(*ScopeTraversalExpr); !ok {
		t.Errorf("TrueResult type = %T, want *ScopeTraversalExpr", cond.TrueResult)
	}
	if _, ok := cond.FalseResult.(*TemplateExpr); !ok {
		t.Errorf("FalseResult type = %T, want *TemplateExpr", cond.FalseResult)
	}
}

func TestConditionalExprNested(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`locals { x = a ? b : c ? d : e }`), "t.tf")
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	cond, ok := expr.(*ConditionalExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *ConditionalExpr", expr)
	}
	if _, ok := cond.FalseResult.(*ConditionalExpr); !ok {
		t.Errorf("FalseResult type = %T, want *ConditionalExpr", cond.FalseResult)
	}
}

func TestForExprList(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`locals { x = [for v in var.xs : v.id] }`), "t.tf")
	if len(result.Diagnostics) != 0 {
		t.Fatalf("unexpected diagnostics: %+v", result.Diagnostics)
	}
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	fe, ok := expr.(*ForExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *ForExpr", expr)
	}
	if fe.Type != "ForExpr" {
		t.Errorf("Type = %q", fe.Type)
	}
	if fe.ValVar != "v" {
		t.Errorf("ValVar = %q, want %q", fe.ValVar, "v")
	}
	if fe.KeyVar != "" {
		t.Errorf("KeyVar = %q, want empty", fe.KeyVar)
	}
	if fe.KeyExpr != nil {
		t.Errorf("KeyExpr = %#v, want nil", fe.KeyExpr)
	}
	if _, ok := fe.CollExpr.(*ScopeTraversalExpr); !ok {
		t.Errorf("CollExpr type = %T, want *ScopeTraversalExpr", fe.CollExpr)
	}
	if _, ok := fe.ValExpr.(*ScopeTraversalExpr); !ok {
		t.Errorf("ValExpr type = %T, want *ScopeTraversalExpr", fe.ValExpr)
	}
}

func TestForExprObject(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`locals { x = {for k, v in var.m : k => v} }`), "t.tf")
	if len(result.Diagnostics) != 0 {
		t.Fatalf("unexpected diagnostics: %+v", result.Diagnostics)
	}
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	fe, ok := expr.(*ForExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *ForExpr", expr)
	}
	if fe.KeyVar != "k" {
		t.Errorf("KeyVar = %q, want %q", fe.KeyVar, "k")
	}
	if fe.ValVar != "v" {
		t.Errorf("ValVar = %q, want %q", fe.ValVar, "v")
	}
	if _, ok := fe.KeyExpr.(*ScopeTraversalExpr); !ok {
		t.Errorf("KeyExpr type = %T, want *ScopeTraversalExpr", fe.KeyExpr)
	}
	if _, ok := fe.ValExpr.(*ScopeTraversalExpr); !ok {
		t.Errorf("ValExpr type = %T, want *ScopeTraversalExpr", fe.ValExpr)
	}
}

func TestSplatExprAttr(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`locals { x = aws_instance.x[*].id }`), "t.tf")
	if len(result.Diagnostics) != 0 {
		t.Fatalf("unexpected diagnostics: %+v", result.Diagnostics)
	}
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	se, ok := expr.(*SplatExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *SplatExpr", expr)
	}
	if se.Type != "SplatExpr" {
		t.Errorf("Type = %q", se.Type)
	}
	if _, ok := se.Source.(*ScopeTraversalExpr); !ok {
		t.Errorf("Source type = %T, want *ScopeTraversalExpr", se.Source)
	}
}

func TestSplatExprAttrDotForm(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`locals { x = aws_instance.x.*.id }`), "t.tf")
	if len(result.Diagnostics) != 0 {
		t.Fatalf("unexpected diagnostics: %+v", result.Diagnostics)
	}
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	se, ok := expr.(*SplatExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *SplatExpr", expr)
	}
	if _, ok := se.Source.(*ScopeTraversalExpr); !ok {
		t.Errorf("Source type = %T, want *ScopeTraversalExpr", se.Source)
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
