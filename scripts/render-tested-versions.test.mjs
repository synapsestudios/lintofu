import { describe, expect, it } from "vitest";
import { renderTestedVersions } from "./render-tested-versions.mjs";

const START = "<!-- lintofu:tested-versions:start -->";
const END = "<!-- lintofu:tested-versions:end -->";
const readme = `before\n${START}\nstale\n${END}\nafter`;

describe("renderTestedVersions", () => {
	it("renders a section for a single provider between the markers", () => {
		const out = renderTestedVersions(readme, { aws: ["6.42.0"] });
		expect(out).toContain("- aws provider v6.42.0");
		expect(out).not.toContain("stale");
	});

	it("renders one line per provider, sorted by provider name", () => {
		const out = renderTestedVersions(readme, {
			google: ["5.1.0"],
			aws: ["6.42.0"],
		});
		expect(out.indexOf("- aws provider")).toBeLessThan(
			out.indexOf("- google provider"),
		);
	});

	it("prefixes versions with v and joins with commas in json order", () => {
		const out = renderTestedVersions(readme, {
			aws: ["6.42.0", "6.41.0", "6.40.0"],
		});
		expect(out).toContain("- aws provider v6.42.0, v6.41.0, v6.40.0");
	});

	it("leaves content outside the markers untouched", () => {
		const out = renderTestedVersions(readme, { aws: ["6.42.0"] });
		expect(out.startsWith("before\n")).toBe(true);
		expect(out.endsWith("\nafter")).toBe(true);
	});

	it("is idempotent", () => {
		const versions = { aws: ["6.42.0"] };
		const once = renderTestedVersions(readme, versions);
		expect(renderTestedVersions(once, versions)).toBe(once);
	});

	it("renders no version lines for an empty versions map", () => {
		const out = renderTestedVersions(readme, {});
		expect(out).toContain("## Tested provider versions");
		expect(out).not.toMatch(/^- /m);
	});

	it("throws when the start marker is missing", () => {
		expect(() =>
			renderTestedVersions(`no markers\n${END}`, { aws: ["6.42.0"] }),
		).toThrow(/markers/);
	});

	it("throws when the end marker is missing", () => {
		expect(() =>
			renderTestedVersions(`${START}\nno end`, { aws: ["6.42.0"] }),
		).toThrow(/markers/);
	});

	it("throws when the markers are out of order", () => {
		expect(() =>
			renderTestedVersions(`${END}\nmiddle\n${START}`, { aws: ["6.42.0"] }),
		).toThrow(/markers/);
	});
});
