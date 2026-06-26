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

type Result struct {
	AST         *Body        `json:"ast"`
	Diagnostics []Diagnostic `json:"diagnostics"`
}

// Parse always returns a non-nil AST, even on fatal parse errors.
func Parse(src []byte, filename string) Result {
	file, diags := hclsyntax.ParseConfig(src, filename, hcl.Pos{Line: 1, Column: 1})

	result := Result{Diagnostics: convertDiagnostics(diags)}
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

func emptyBody() *Body {
	return &Body{
		Type:       "Body",
		Blocks:     []*Block{},
		Attributes: []*Attribute{},
	}
}
