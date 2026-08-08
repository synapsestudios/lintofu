# Parser services

Rules have access to a lazily-built, cross-file index via `context.sourceCode.parserServices.projectIndex`:

```ts
interface ProjectIndex {
  findResource(addr: { kind: string; labels: string[] }): Block | undefined;
  resolveTraversal(expr: ScopeTraversalExpr): Block | undefined;
  resourcesByType(type: string): readonly Block[];
}
```

Scope is every `.tf` / `.tofu` file in the same directory as the file being linted, which matches OpenTofu's module boundary. The index is cached per-directory and invalidated via file mtime. `findResource` takes an explicit address; `resolveTraversal` accepts a `ScopeTraversalExpr` like `aws_security_group.foo.id` and returns the defining `Block` or `undefined`; `resourcesByType` returns every resource block of a type (e.g. `aws_rds_cluster_instance`), which cross-resource rules use to enumerate a whole type.
