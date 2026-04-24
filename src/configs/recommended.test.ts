import { describe, expect, it } from "vitest";
import { buildRecommendedRules } from "./recommended.js";

describe("buildRecommendedRules", () => {
	it("returns an empty rules object when no rules are passed", () => {
		expect(buildRecommendedRules({})).toEqual({});
	});

	it("includes a recommended rule with its severity, keyed by lintofu/<name>", () => {
		const rules = {
			foo: { meta: { docs: { recommended: true, severity: "error" } } },
		};
		expect(buildRecommendedRules(rules)).toEqual({
			"lintofu/foo": "error",
		});
	});

	it("excludes rules whose recommended flag is false or missing", () => {
		const rules = {
			yes: { meta: { docs: { recommended: true, severity: "warn" } } },
			no: { meta: { docs: { recommended: false, severity: "error" } } },
			silent: { meta: { docs: {} } },
		} as const;
		expect(buildRecommendedRules(rules)).toEqual({
			"lintofu/yes": "warn",
		});
	});

	it("defaults severity to error when a recommended rule omits it", () => {
		const rules = {
			foo: { meta: { docs: { recommended: true } } },
		};
		expect(buildRecommendedRules(rules)).toEqual({
			"lintofu/foo": "error",
		});
	});
});
