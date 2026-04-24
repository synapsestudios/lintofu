import { describe, expect, it } from "vitest";
import { buildCategoryRecommendedRules } from "./category-recommended.js";

describe("buildCategoryRecommendedRules", () => {
	it("returns an empty rules object when no rules are passed", () => {
		expect(buildCategoryRecommendedRules({}, "aws")).toEqual({});
	});

	it("includes a recommended rule in the category at its severity, keyed by lintofu/<name>", () => {
		const rules = {
			foo: {
				meta: {
					docs: { recommended: true, severity: "error", category: "aws" },
				},
			},
		} as const;
		expect(buildCategoryRecommendedRules(rules, "aws")).toEqual({
			"lintofu/foo": "error",
		});
	});

	it("excludes rules whose category does not match", () => {
		const rules = {
			aws: {
				meta: {
					docs: { recommended: true, severity: "error", category: "aws" },
				},
			},
			gcp: {
				meta: {
					docs: { recommended: true, severity: "error", category: "gcp" },
				},
			},
			uncategorized: {
				meta: { docs: { recommended: true, severity: "error" } },
			},
		} as const;
		expect(buildCategoryRecommendedRules(rules, "aws")).toEqual({
			"lintofu/aws": "error",
		});
	});

	it("excludes rules in the category that are not recommended", () => {
		const rules = {
			yes: {
				meta: {
					docs: { recommended: true, severity: "error", category: "aws" },
				},
			},
			no: {
				meta: {
					docs: { recommended: false, severity: "error", category: "aws" },
				},
			},
			silent: { meta: { docs: { category: "aws", severity: "error" } } },
		} as const;
		expect(buildCategoryRecommendedRules(rules, "aws")).toEqual({
			"lintofu/yes": "error",
		});
	});

	it("defaults severity to error when a matching rule omits it", () => {
		const rules = {
			foo: { meta: { docs: { recommended: true, category: "aws" } } },
		} as const;
		expect(buildCategoryRecommendedRules(rules, "aws")).toEqual({
			"lintofu/foo": "error",
		});
	});
});
