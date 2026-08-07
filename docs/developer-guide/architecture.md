# Architecture

The parser is Go; we wrap `github.com/hashicorp/hcl/v2/hclsyntax` and compile it to WebAssembly. JS can't faithfully parse HCL v2 today; the existing npm packages are unmaintained or drop source positions.

At a high level:

```
.tf / .tofu file
      │
      ▼
OpenTofuLanguage.parse
      │
      ▼
parseSync (JS)
      │
      ▼
__lintofu_parse (WASM)
      │
      ▼
JSON AST
      │
      ▼
ESLint rules
```
