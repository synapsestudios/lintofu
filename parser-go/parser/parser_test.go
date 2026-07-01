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

// A non-constant index key produces an IndexExpr; both the collection and
// the key are inspectable sub-expressions.
func TestIndexExpr(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`locals { x = var.commands[var.i] }`), "t.tf")
	if len(result.Diagnostics) != 0 {
		t.Fatalf("unexpected diagnostics: %+v", result.Diagnostics)
	}
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	ie, ok := expr.(*IndexExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *IndexExpr", expr)
	}
	if ie.Type != "IndexExpr" {
		t.Errorf("Type = %q", ie.Type)
	}
	if _, ok := ie.Collection.(*ScopeTraversalExpr); !ok {
		t.Errorf("Collection type = %T, want *ScopeTraversalExpr", ie.Collection)
	}
	if _, ok := ie.Key.(*ScopeTraversalExpr); !ok {
		t.Errorf("Key type = %T, want *ScopeTraversalExpr", ie.Key)
	}
}

// A constant index is folded into the traversal as a TraverseIndex step
// rather than an IndexExpr.
func TestTraverseIndexNumber(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`locals { x = var.commands[0] }`), "t.tf")
	if len(result.Diagnostics) != 0 {
		t.Fatalf("unexpected diagnostics: %+v", result.Diagnostics)
	}
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	st, ok := expr.(*ScopeTraversalExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *ScopeTraversalExpr", expr)
	}
	if len(st.Traversal) != 3 {
		t.Fatalf("traversal len = %d, want 3", len(st.Traversal))
	}
	ti, ok := st.Traversal[2].(*TraverseIndex)
	if !ok {
		t.Fatalf("traversal[2] type = %T, want *TraverseIndex", st.Traversal[2])
	}
	if ti.Key != float64(0) {
		t.Errorf("Key = %v, want 0", ti.Key)
	}
}

func TestTraverseIndexString(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`locals { x = local.map["region"] }`), "t.tf")
	if len(result.Diagnostics) != 0 {
		t.Fatalf("unexpected diagnostics: %+v", result.Diagnostics)
	}
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	st, ok := expr.(*ScopeTraversalExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *ScopeTraversalExpr", expr)
	}
	ti, ok := st.Traversal[len(st.Traversal)-1].(*TraverseIndex)
	if !ok {
		t.Fatalf("last traverser type = %T, want *TraverseIndex", st.Traversal[len(st.Traversal)-1])
	}
	if ti.Key != "region" {
		t.Errorf("Key = %v, want region", ti.Key)
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

func TestLineCommentTrimsTrailingNewline(t *testing.T) {
	t.Parallel()
	for _, prefix := range []string{"#", "//"} {
		result := Parse([]byte(prefix+" note\nvariable \"v\" {}"), "t.tf")
		if len(result.Comments) != 1 {
			t.Fatalf("%s: got %d comments, want 1", prefix, len(result.Comments))
		}
		c := result.Comments[0]
		if c.Type != "Comment" || c.Kind != "line" {
			t.Errorf("%s: Type/Kind = %q/%q", prefix, c.Type, c.Kind)
		}
		if c.Value != prefix+" note" {
			t.Errorf("%s: Value = %q", prefix, c.Value)
		}
		// The trailing newline must not push the end onto line 2.
		if c.Range.Start.Line != 1 || c.Range.End.Line != 1 {
			t.Errorf("%s: range spans lines %d..%d, want 1..1",
				prefix, c.Range.Start.Line, c.Range.End.Line)
		}
	}
}

func TestBlockCommentRangeIntact(t *testing.T) {
	t.Parallel()
	result := Parse([]byte("/* note */\nvariable \"v\" {}"), "t.tf")
	if len(result.Comments) != 1 {
		t.Fatalf("got %d comments, want 1", len(result.Comments))
	}
	c := result.Comments[0]
	if c.Kind != "block" || c.Value != "/* note */" {
		t.Errorf("Kind/Value = %q/%q", c.Kind, c.Value)
	}
	if c.Range.End.Line != 1 {
		t.Errorf("block comment end line = %d, want 1", c.Range.End.Line)
	}
}

func TestCommentInsideStringIsNotCollected(t *testing.T) {
	t.Parallel()
	result := Parse([]byte("variable \"v\" {\n  default = \"a # b\"\n}"), "t.tf")
	if len(result.Comments) != 0 {
		t.Errorf("got %d comments, want 0: %+v", len(result.Comments), result.Comments)
	}
}

// `(var.x).address`: the parens force a RelativeTraversalExpr whose source is
// a ParenthesesExpr wrapping the inner traversal, not a bare ScopeTraversalExpr.
func TestRelativeTraversalExprParens(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`locals { x = (var.bastion).address }`), "t.tf")
	if len(result.Diagnostics) != 0 {
		t.Fatalf("unexpected diagnostics: %+v", result.Diagnostics)
	}
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	rte, ok := expr.(*RelativeTraversalExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *RelativeTraversalExpr", expr)
	}
	if rte.Type != "RelativeTraversalExpr" {
		t.Errorf("Type = %q", rte.Type)
	}
	if len(rte.Traversal) != 1 {
		t.Fatalf("traversal len = %d, want 1", len(rte.Traversal))
	}
	attr, ok := rte.Traversal[0].(*TraverseAttr)
	if !ok || attr.Name != "address" {
		t.Errorf("traversal[0] = %#v, want TraverseAttr address", rte.Traversal[0])
	}
	paren, ok := rte.Source.(*ParenthesesExpr)
	if !ok {
		t.Fatalf("Source type = %T, want *ParenthesesExpr", rte.Source)
	}
	if _, ok := paren.Expression.(*ScopeTraversalExpr); !ok {
		t.Errorf("ParenthesesExpr.Expression type = %T, want *ScopeTraversalExpr", paren.Expression)
	}
}

// `aws_instance.x[*].id`: the splat stays a SplatExpr; the `.id` is a
// RelativeTraversalExpr in the splat's Each, rooted on the anonymous symbol.
func TestRelativeTraversalExprSplatEach(t *testing.T) {
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
	rte, ok := se.Each.(*RelativeTraversalExpr)
	if !ok {
		t.Fatalf("Each type = %T, want *RelativeTraversalExpr", se.Each)
	}
	attr, ok := rte.Traversal[0].(*TraverseAttr)
	if !ok || attr.Name != "id" {
		t.Errorf("traversal[0] = %#v, want TraverseAttr id", rte.Traversal[0])
	}
}

func TestBinaryOpExpr(t *testing.T) {
	t.Parallel()
	result := Parse([]byte(`locals { x = var.a == var.b }`), "t.tf")
	if len(result.Diagnostics) != 0 {
		t.Fatalf("unexpected diagnostics: %+v", result.Diagnostics)
	}
	expr := result.AST.Blocks[0].Body.Attributes[0].Expression
	bin, ok := expr.(*BinaryOpExpr)
	if !ok {
		t.Fatalf("expr type = %T, want *BinaryOpExpr", expr)
	}
	if bin.Type != "BinaryOpExpr" {
		t.Errorf("Type = %q", bin.Type)
	}
	if bin.Op != "equal" {
		t.Errorf("Op = %q, want \"equal\"", bin.Op)
	}
	if _, ok := bin.LHS.(*ScopeTraversalExpr); !ok {
		t.Errorf("LHS type = %T, want *ScopeTraversalExpr", bin.LHS)
	}
	if _, ok := bin.RHS.(*ScopeTraversalExpr); !ok {
		t.Errorf("RHS type = %T, want *ScopeTraversalExpr", bin.RHS)
	}
}

// One operator per category (comparison already covered by TestBinaryOpExpr):
// exercises the operationName mapping without asserting all thirteen.
func TestBinaryOpExprOps(t *testing.T) {
	t.Parallel()
	cases := []struct {
		src    string
		wantOp string
	}{
		{`locals { x = var.a + var.b }`, "add"},
		{`locals { x = var.a && var.b }`, "logicalAnd"},
	}
	for _, tc := range cases {
		result := Parse([]byte(tc.src), "t.tf")
		if len(result.Diagnostics) != 0 {
			t.Fatalf("%s: unexpected diagnostics: %+v", tc.src, result.Diagnostics)
		}
		expr := result.AST.Blocks[0].Body.Attributes[0].Expression
		bin, ok := expr.(*BinaryOpExpr)
		if !ok {
			t.Fatalf("%s: expr type = %T, want *BinaryOpExpr", tc.src, expr)
		}
		if bin.Op != tc.wantOp {
			t.Errorf("%s: Op = %q, want %q", tc.src, bin.Op, tc.wantOp)
		}
	}
}

func TestUnaryOpExpr(t *testing.T) {
	t.Parallel()
	cases := []struct {
		src    string
		wantOp string
	}{
		{`locals { x = !var.enabled }`, "logicalNot"},
		{`locals { x = -var.n }`, "negate"},
	}
	for _, tc := range cases {
		result := Parse([]byte(tc.src), "t.tf")
		if len(result.Diagnostics) != 0 {
			t.Fatalf("%s: unexpected diagnostics: %+v", tc.src, result.Diagnostics)
		}
		expr := result.AST.Blocks[0].Body.Attributes[0].Expression
		un, ok := expr.(*UnaryOpExpr)
		if !ok {
			t.Fatalf("%s: expr type = %T, want *UnaryOpExpr", tc.src, expr)
		}
		if un.Type != "UnaryOpExpr" {
			t.Errorf("%s: Type = %q", tc.src, un.Type)
		}
		if un.Op != tc.wantOp {
			t.Errorf("%s: Op = %q, want %q", tc.src, un.Op, tc.wantOp)
		}
		if _, ok := un.Operand.(*ScopeTraversalExpr); !ok {
			t.Errorf("%s: Operand type = %T, want *ScopeTraversalExpr", tc.src, un.Operand)
		}
	}
}
