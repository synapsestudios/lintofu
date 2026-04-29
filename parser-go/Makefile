GOLANGCI_VERSION := 2.11.4

GO_LINT_ENV := GOOS=js GOARCH=wasm

.PHONY: fmt fmt-check lint test install-tools

fmt:
	$(GO_LINT_ENV) golangci-lint fmt

fmt-check:
	@out=$$($(GO_LINT_ENV) golangci-lint fmt --diff); \
	if [ -n "$$out" ]; then echo "$$out"; echo; echo "files need formatting; run 'make fmt'"; exit 1; fi

lint:
	$(GO_LINT_ENV) golangci-lint run

test:
	go test -count=1 ./...

install-tools:
	go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v$(GOLANGCI_VERSION)
