// Package parser wraps hclsyntax and emits a JSON-serializable AST.
package parser

import (
	"fmt"
	"sort"

	"github.com/hashicorp/hcl/v2"
	"github.com/hashicorp/hcl/v2/hclsyntax"
	"github.com/zclconf/go-cty/cty"
)

// Line and Column are 1-indexed; Column is a byte offset within the line,
// not a character offset. Offset is a 0-indexed byte offset from BOF.
type Pos struct {
	Line   int `json:"line"`
	Column int `json:"column"`
	Offset int `json:"offset"`
}

// Range is half-open: [Start, End).
type Range struct {
	Start Pos `json:"start"`
	End   Pos `json:"end"`
}

type Body struct {
	Type       string       `json:"type"`
	Blocks     []*Block     `json:"blocks"`
	Attributes []*Attribute `json:"attributes"`
	Range      Range        `json:"range"`
}

// Kind is hclsyntax's block-type name ("resource", "variable", ...);
// renamed because Type is reserved for the ESLint discriminator.
type Block struct {
	Type   string   `json:"type"`
	Kind   string   `json:"kind"`
	Labels []string `json:"labels"`
	Body   *Body    `json:"body"`
	Range  Range    `json:"range"`
}

type Attribute struct {
	Type       string     `json:"type"`
	Name       string     `json:"name"`
	Expression Expression `json:"expression"`
	Range      Range      `json:"range"`
}

type Expression interface {
	expressionMarker()
	expressionRange() Range
}

type LiteralValueExpr struct {
	Type  string `json:"type"`
	Value any    `json:"value"`
	Range Range  `json:"range"`
}

func (*LiteralValueExpr) expressionMarker()        {}
func (e *LiteralValueExpr) expressionRange() Range { return e.Range }

// HCL wraps every double-quoted string in TemplateExpr, even constants.
type TemplateExpr struct {
	Type  string       `json:"type"`
	Parts []Expression `json:"parts"`
	Range Range        `json:"range"`
}

func (*TemplateExpr) expressionMarker()        {}
func (e *TemplateExpr) expressionRange() Range { return e.Range }

type FunctionCallExpr struct {
	Type string       `json:"type"`
	Name string       `json:"name"`
	Args []Expression `json:"args"`
	// ExpandFinal is HCL's `...` spread of the final argument, e.g.
	// `concat(a, b...)`.
	ExpandFinal bool  `json:"expandFinal"`
	Range       Range `json:"range"`
}

func (*FunctionCallExpr) expressionMarker()        {}
func (e *FunctionCallExpr) expressionRange() Range { return e.Range }

type ScopeTraversalExpr struct {
	Type      string      `json:"type"`
	Traversal []Traverser `json:"traversal"`
	Range     Range       `json:"range"`
}

func (*ScopeTraversalExpr) expressionMarker()        {}
func (e *ScopeTraversalExpr) expressionRange() Range { return e.Range }

type Traverser interface {
	traverserMarker()
}

type TraverseRoot struct {
	Type  string `json:"type"`
	Name  string `json:"name"`
	Range Range  `json:"range"`
}

func (*TraverseRoot) traverserMarker() {}

type TraverseAttr struct {
	Type  string `json:"type"`
	Name  string `json:"name"`
	Range Range  `json:"range"`
}

func (*TraverseAttr) traverserMarker() {}

type TraverseIndex struct {
	Type  string `json:"type"`
	Key   any    `json:"key"`
	Range Range  `json:"range"`
}

func (*TraverseIndex) traverserMarker() {}

type ObjectConsExpr struct {
	Type  string           `json:"type"`
	Items []ObjectConsItem `json:"items"`
	Range Range            `json:"range"`
}

func (*ObjectConsExpr) expressionMarker()        {}
func (e *ObjectConsExpr) expressionRange() Range { return e.Range }

type ObjectConsItem struct {
	KeyExpr   Expression `json:"keyExpr"`
	ValueExpr Expression `json:"valueExpr"`
}

type TupleConsExpr struct {
	Type  string       `json:"type"`
	Exprs []Expression `json:"exprs"`
	Range Range        `json:"range"`
}

func (*TupleConsExpr) expressionMarker()        {}
func (e *TupleConsExpr) expressionRange() Range { return e.Range }

// Wraps a key expression so a bare identifier like `version = "x"` isn't
// mistaken for a reference to a real symbol.
type ObjectConsKeyExpr struct {
	Type    string     `json:"type"`
	Wrapped Expression `json:"wrapped"`
	Range   Range      `json:"range"`
}

func (*ObjectConsKeyExpr) expressionMarker()        {}
func (e *ObjectConsKeyExpr) expressionRange() Range { return e.Range }

// The `"${expr}"` pattern: a template with a single non-literal part and
// no surrounding text. hclsyntax emits this distinct type so callers can
// distinguish redundant wrapping from genuine templates.
type TemplateWrapExpr struct {
	Type    string     `json:"type"`
	Wrapped Expression `json:"wrapped"`
	Range   Range      `json:"range"`
}

func (*TemplateWrapExpr) expressionMarker()        {}
func (e *TemplateWrapExpr) expressionRange() Range { return e.Range }

type ConditionalExpr struct {
	Type        string     `json:"type"`
	Condition   Expression `json:"condition"`
	TrueResult  Expression `json:"trueResult"`
	FalseResult Expression `json:"falseResult"`
	Range       Range      `json:"range"`
}

func (*ConditionalExpr) expressionMarker()        {}
func (e *ConditionalExpr) expressionRange() Range { return e.Range }

type ForExpr struct {
	Type     string     `json:"type"`
	KeyVar   string     `json:"keyVar"`
	ValVar   string     `json:"valVar"`
	CollExpr Expression `json:"collExpr"`
	KeyExpr  Expression `json:"keyExpr,omitempty"`
	ValExpr  Expression `json:"valExpr"`
	CondExpr Expression `json:"condExpr,omitempty"`
	Group    bool       `json:"group"`
	Range    Range      `json:"range"`
}

func (*ForExpr) expressionMarker()        {}
func (e *ForExpr) expressionRange() Range { return e.Range }

type SplatExpr struct {
	Type   string     `json:"type"`
	Source Expression `json:"source"`
	Each   Expression `json:"each"`
	Range  Range      `json:"range"`
}

func (*SplatExpr) expressionMarker()        {}
func (e *SplatExpr) expressionRange() Range { return e.Range }

type IndexExpr struct {
	Type       string     `json:"type"`
	Collection Expression `json:"collection"`
	Key        Expression `json:"key"`
	Range      Range      `json:"range"`
}

func (*IndexExpr) expressionMarker()        {}
func (e *IndexExpr) expressionRange() Range { return e.Range }

// A traversal chained onto a non-variable source, e.g. the `.id` in
// `aws_instance.x[*].id` (source is the splat's anonymous symbol) or the
// `.address` in `(var.x).address` (source is a ParenthesesExpr). A traversal
// rooted on a bare symbol folds into ScopeTraversalExpr instead.
type RelativeTraversalExpr struct {
	Type      string      `json:"type"`
	Source    Expression  `json:"source"`
	Traversal []Traverser `json:"traversal"`
	Range     Range       `json:"range"`
}

func (*RelativeTraversalExpr) expressionMarker()        {}
func (e *RelativeTraversalExpr) expressionRange() Range { return e.Range }

// `(expr)`: explicit grouping parens. hclsyntax keeps the node so a traversal
// or operator hanging off the group has something to attach to.
type ParenthesesExpr struct {
	Type       string     `json:"type"`
	Expression Expression `json:"expression"`
	Range      Range      `json:"range"`
}

func (*ParenthesesExpr) expressionMarker()        {}
func (e *ParenthesesExpr) expressionRange() Range { return e.Range }

// Op is the operator's name (e.g. "equal", "logicalAnd", "add"), not its
// source symbol; see operationName.
type BinaryOpExpr struct {
	Type  string     `json:"type"`
	Op    string     `json:"op"`
	LHS   Expression `json:"lhs"`
	RHS   Expression `json:"rhs"`
	Range Range      `json:"range"`
}

func (*BinaryOpExpr) expressionMarker()        {}
func (e *BinaryOpExpr) expressionRange() Range { return e.Range }

// `!x`, `-x`. Op is "logicalNot" or "negate"; see operationName.
type UnaryOpExpr struct {
	Type    string     `json:"type"`
	Op      string     `json:"op"`
	Operand Expression `json:"operand"`
	Range   Range      `json:"range"`
}

func (*UnaryOpExpr) expressionMarker()        {}
func (e *UnaryOpExpr) expressionRange() Range { return e.Range }

type UnknownExpr struct {
	Type        string `json:"type"`
	UnknownKind string `json:"unknownKind"`
	Range       Range  `json:"range"`
}

func (*UnknownExpr) expressionMarker()        {}
func (e *UnknownExpr) expressionRange() Range { return e.Range }

type Diagnostic struct {
	Severity string `json:"severity"`
	Summary  string `json:"summary"`
	Detail   string `json:"detail,omitempty"`
	Range    Range  `json:"range"`
}

// Comment is not an AST node: it lives on its own channel so rule visitors
// never receive it. Kind is "line" (# or //) or "block" (/* */).
type Comment struct {
	Type  string `json:"type"`
	Kind  string `json:"kind"`
	Value string `json:"value"`
	Range Range  `json:"range"`
}

type Result struct {
	AST         *Body        `json:"ast"`
	Comments    []*Comment   `json:"comments"`
	Diagnostics []Diagnostic `json:"diagnostics"`
}

// Parse always returns a non-nil AST, even on fatal parse errors.
func Parse(src []byte, filename string) Result {
	file, diags := hclsyntax.ParseConfig(src, filename, hcl.Pos{Line: 1, Column: 1})

	result := Result{
		Comments:    collectComments(src, filename),
		Diagnostics: convertDiagnostics(diags),
	}
	if file == nil {
		result.AST = emptyBody()
		return result
	}
	body, ok := file.Body.(*hclsyntax.Body)
	if !ok {
		result.AST = emptyBody()
		return result
	}
	result.AST = convertBody(body)
	return result
}

func convertBody(b *hclsyntax.Body) *Body {
	if b == nil {
		return emptyBody()
	}
	out := &Body{
		Type:       "Body",
		Blocks:     make([]*Block, 0, len(b.Blocks)),
		Attributes: make([]*Attribute, 0, len(b.Attributes)),
		Range:      convertRange(b.Range()),
	}
	for _, block := range b.Blocks {
		out.Blocks = append(out.Blocks, convertBlock(block))
	}
	// hclsyntax.Body.Attributes is a map; sort by source byte for stable
	// iteration order across runs.
	attrs := make([]*hclsyntax.Attribute, 0, len(b.Attributes))
	for _, a := range b.Attributes {
		attrs = append(attrs, a)
	}
	sort.Slice(attrs, func(i, j int) bool {
		return attrs[i].SrcRange.Start.Byte < attrs[j].SrcRange.Start.Byte
	})
	for _, a := range attrs {
		out.Attributes = append(out.Attributes, convertAttribute(a))
	}
	return out
}

func convertAttribute(a *hclsyntax.Attribute) *Attribute {
	return &Attribute{
		Type:       "Attribute",
		Name:       a.Name,
		Expression: convertExpression(a.Expr),
		Range:      convertRange(a.SrcRange),
	}
}

func convertExpression(e hclsyntax.Expression) Expression {
	if e == nil {
		return nil
	}
	switch ex := e.(type) {
	case *hclsyntax.LiteralValueExpr:
		return &LiteralValueExpr{
			Type:  "LiteralValueExpr",
			Value: ctyToGo(ex.Val),
			Range: convertRange(ex.Range()),
		}
	case *hclsyntax.TemplateExpr:
		parts := make([]Expression, 0, len(ex.Parts))
		for _, p := range ex.Parts {
			parts = append(parts, convertExpression(p))
		}
		return &TemplateExpr{
			Type:  "TemplateExpr",
			Parts: parts,
			Range: convertRange(ex.Range()),
		}
	case *hclsyntax.FunctionCallExpr:
		args := make([]Expression, 0, len(ex.Args))
		for _, a := range ex.Args {
			args = append(args, convertExpression(a))
		}
		return &FunctionCallExpr{
			Type:        "FunctionCallExpr",
			Name:        ex.Name,
			Args:        args,
			ExpandFinal: ex.ExpandFinal,
			Range:       convertRange(ex.Range()),
		}
	case *hclsyntax.ScopeTraversalExpr:
		travs := make([]Traverser, 0, len(ex.Traversal))
		for _, t := range ex.Traversal {
			travs = append(travs, convertTraverser(t))
		}
		return &ScopeTraversalExpr{
			Type:      "ScopeTraversalExpr",
			Traversal: travs,
			Range:     convertRange(ex.Range()),
		}
	case *hclsyntax.ObjectConsExpr:
		items := make([]ObjectConsItem, 0, len(ex.Items))
		for _, it := range ex.Items {
			items = append(items, ObjectConsItem{
				KeyExpr:   convertExpression(it.KeyExpr),
				ValueExpr: convertExpression(it.ValueExpr),
			})
		}
		return &ObjectConsExpr{
			Type:  "ObjectConsExpr",
			Items: items,
			Range: convertRange(ex.Range()),
		}
	case *hclsyntax.TupleConsExpr:
		exprs := make([]Expression, 0, len(ex.Exprs))
		for _, e := range ex.Exprs {
			exprs = append(exprs, convertExpression(e))
		}
		return &TupleConsExpr{
			Type:  "TupleConsExpr",
			Exprs: exprs,
			Range: convertRange(ex.Range()),
		}
	case *hclsyntax.ObjectConsKeyExpr:
		return &ObjectConsKeyExpr{
			Type:    "ObjectConsKeyExpr",
			Wrapped: convertExpression(ex.Wrapped),
			Range:   convertRange(ex.Range()),
		}
	case *hclsyntax.TemplateWrapExpr:
		return &TemplateWrapExpr{
			Type:    "TemplateWrapExpr",
			Wrapped: convertExpression(ex.Wrapped),
			Range:   convertRange(ex.Range()),
		}
	case *hclsyntax.ConditionalExpr:
		return &ConditionalExpr{
			Type:        "ConditionalExpr",
			Condition:   convertExpression(ex.Condition),
			TrueResult:  convertExpression(ex.TrueResult),
			FalseResult: convertExpression(ex.FalseResult),
			Range:       convertRange(ex.Range()),
		}
	case *hclsyntax.ForExpr:
		return &ForExpr{
			Type:     "ForExpr",
			KeyVar:   ex.KeyVar,
			ValVar:   ex.ValVar,
			CollExpr: convertExpression(ex.CollExpr),
			KeyExpr:  convertExpression(ex.KeyExpr),
			ValExpr:  convertExpression(ex.ValExpr),
			CondExpr: convertExpression(ex.CondExpr),
			Group:    ex.Group,
			Range:    convertRange(ex.Range()),
		}
	case *hclsyntax.SplatExpr:
		return &SplatExpr{
			Type:   "SplatExpr",
			Source: convertExpression(ex.Source),
			Each:   convertExpression(ex.Each),
			Range:  convertRange(ex.Range()),
		}
	case *hclsyntax.IndexExpr:
		return &IndexExpr{
			Type:       "IndexExpr",
			Collection: convertExpression(ex.Collection),
			Key:        convertExpression(ex.Key),
			Range:      convertRange(ex.Range()),
		}
	case *hclsyntax.RelativeTraversalExpr:
		travs := make([]Traverser, 0, len(ex.Traversal))
		for _, t := range ex.Traversal {
			travs = append(travs, convertTraverser(t))
		}
		return &RelativeTraversalExpr{
			Type:      "RelativeTraversalExpr",
			Source:    convertExpression(ex.Source),
			Traversal: travs,
			Range:     convertRange(ex.Range()),
		}
	case *hclsyntax.ParenthesesExpr:
		return &ParenthesesExpr{
			Type:       "ParenthesesExpr",
			Expression: convertExpression(ex.Expression),
			Range:      convertRange(ex.Range()),
		}
	case *hclsyntax.BinaryOpExpr:
		return &BinaryOpExpr{
			Type:  "BinaryOpExpr",
			Op:    operationName(ex.Op),
			LHS:   convertExpression(ex.LHS),
			RHS:   convertExpression(ex.RHS),
			Range: convertRange(ex.Range()),
		}
	case *hclsyntax.UnaryOpExpr:
		return &UnaryOpExpr{
			Type:    "UnaryOpExpr",
			Op:      operationName(ex.Op),
			Operand: convertExpression(ex.Val),
			Range:   convertRange(ex.Range()),
		}
	default:
		return &UnknownExpr{
			Type:        "UnknownExpr",
			UnknownKind: goTypeName(e),
			Range:       convertRange(e.Range()),
		}
	}
}

func convertTraverser(t hcl.Traverser) Traverser {
	switch tr := t.(type) {
	case hcl.TraverseRoot:
		return &TraverseRoot{
			Type:  "TraverseRoot",
			Name:  tr.Name,
			Range: convertRange(tr.SrcRange),
		}
	case hcl.TraverseAttr:
		return &TraverseAttr{
			Type:  "TraverseAttr",
			Name:  tr.Name,
			Range: convertRange(tr.SrcRange),
		}
	case hcl.TraverseIndex:
		return &TraverseIndex{
			Type:  "TraverseIndex",
			Key:   ctyToGo(tr.Key),
			Range: convertRange(tr.SrcRange),
		}
	default:
		return nil
	}
}

func ctyToGo(v cty.Value) any {
	if v.IsNull() {
		return nil
	}
	switch v.Type() {
	case cty.String:
		return v.AsString()
	case cty.Bool:
		return v.True()
	case cty.Number:
		f, _ := v.AsBigFloat().Float64()
		return f
	default:
		return nil
	}
}

func goTypeName(e hclsyntax.Expression) string {
	return fmt.Sprintf("%T", e)
}

// operationName maps hclsyntax's operator singletons (compared by pointer
// identity) to a stable name. Covers both binary and unary operators;
// OpLogicalNot and OpNegate are the unary ones.
func operationName(op *hclsyntax.Operation) string {
	switch op {
	case hclsyntax.OpEqual:
		return "equal"
	case hclsyntax.OpNotEqual:
		return "notEqual"
	case hclsyntax.OpGreaterThan:
		return "greaterThan"
	case hclsyntax.OpGreaterThanOrEqual:
		return "greaterThanOrEqual"
	case hclsyntax.OpLessThan:
		return "lessThan"
	case hclsyntax.OpLessThanOrEqual:
		return "lessThanOrEqual"
	case hclsyntax.OpAdd:
		return "add"
	case hclsyntax.OpSubtract:
		return "subtract"
	case hclsyntax.OpMultiply:
		return "multiply"
	case hclsyntax.OpDivide:
		return "divide"
	case hclsyntax.OpModulo:
		return "modulo"
	case hclsyntax.OpLogicalAnd:
		return "logicalAnd"
	case hclsyntax.OpLogicalOr:
		return "logicalOr"
	case hclsyntax.OpLogicalNot:
		return "logicalNot"
	case hclsyntax.OpNegate:
		return "negate"
	default:
		return "unknown"
	}
}

func convertBlock(b *hclsyntax.Block) *Block {
	labels := make([]string, len(b.Labels))
	copy(labels, b.Labels)
	return &Block{
		Type:   "Block",
		Kind:   b.Type,
		Labels: labels,
		Body:   convertBody(b.Body),
		Range:  convertRange(b.Range()),
	}
}

func convertRange(r hcl.Range) Range {
	return Range{
		Start: Pos{Line: r.Start.Line, Column: r.Start.Column, Offset: r.Start.Byte},
		End:   Pos{Line: r.End.Line, Column: r.End.Column, Offset: r.End.Byte},
	}
}

func convertDiagnostics(diags hcl.Diagnostics) []Diagnostic {
	out := make([]Diagnostic, 0, len(diags))
	for _, d := range diags {
		severity := "error"
		if d.Severity == hcl.DiagWarning {
			severity = "warning"
		}
		r := Range{}
		if d.Subject != nil {
			r = convertRange(*d.Subject)
		}
		out = append(out, Diagnostic{
			Severity: severity,
			Summary:  d.Summary,
			Detail:   d.Detail,
			Range:    r,
		})
	}
	return out
}

// collectComments runs a separate lexer pass because ParseConfig does not
// retain comments on the resulting Body. The lexer keeps comments out of
// strings, templates, and heredocs, so a # inside a quoted string never
// surfaces as a comment token. Lex diagnostics are ignored: ParseConfig
// already owns error reporting.
func collectComments(src []byte, filename string) []*Comment {
	tokens, _ := hclsyntax.LexConfig(src, filename, hcl.Pos{Line: 1, Column: 1})
	out := make([]*Comment, 0)
	for _, tok := range tokens {
		if tok.Type != hclsyntax.TokenComment {
			continue
		}
		out = append(out, convertComment(tok))
	}
	return out
}

func convertComment(tok hclsyntax.Token) *Comment {
	bytes := tok.Bytes
	rng := convertRange(tok.Range)
	kind := "block"
	if isLineComment(bytes) {
		kind = "line"
		bytes, rng = trimLineCommentNewline(bytes, rng)
	}
	return &Comment{
		Type:  "Comment",
		Kind:  kind,
		Value: string(bytes),
		Range: rng,
	}
}

func isLineComment(b []byte) bool {
	if len(b) > 0 && b[0] == '#' {
		return true
	}
	return len(b) >= 2 && b[0] == '/' && b[1] == '/'
}

// trimLineCommentNewline drops the trailing newline HCL includes in a line
// comment token. Line comments are single-line, so the trimmed end is
// recomputed from the start using the byte length of the remaining text.
func trimLineCommentNewline(b []byte, rng Range) ([]byte, Range) {
	trimmed := b
	for len(trimmed) > 0 {
		last := trimmed[len(trimmed)-1]
		if last != '\n' && last != '\r' {
			break
		}
		trimmed = trimmed[:len(trimmed)-1]
	}
	if len(trimmed) == len(b) {
		return b, rng
	}
	rng.End = Pos{
		Line:   rng.Start.Line,
		Column: rng.Start.Column + len(trimmed),
		Offset: rng.Start.Offset + len(trimmed),
	}
	return trimmed, rng
}

func emptyBody() *Body {
	return &Body{
		Type:       "Body",
		Blocks:     []*Block{},
		Attributes: []*Attribute{},
	}
}
