import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const START = "<!-- lintofu:tested-versions:start -->";
const END = "<!-- lintofu:tested-versions:end -->";

export function renderTestedVersions(readme, versions) {
	const start = readme.indexOf(START);
	const end = readme.indexOf(END);
	if (start === -1 || end === -1 || end < start) {
		throw new Error("tested-versions markers missing or out of order");
	}
	const lines = Object.keys(versions)
		.sort()
		.map(
			(provider) =>
				`- ${provider} provider ${versions[provider].map((v) => `v${v}`).join(", ")}`,
		);
	const section = [
		START,
		"",
		"## Tested provider versions",
		"",
		"Provider-specific rules are validated against these versions. [`provider-versions.json`](./provider-versions.json) is the source of truth; edit it and run `npm run docs:versions` to update this section. CI fails if the two drift.",
		"",
		...lines,
		"",
		END,
	].join("\n");
	return readme.slice(0, start) + section + readme.slice(end + END.length);
}

const isMain =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
	const root = join(dirname(fileURLToPath(import.meta.url)), "..");
	const versions = JSON.parse(
		await readFile(join(root, "provider-versions.json"), "utf8"),
	);
	const readmePath = join(root, "README.md");
	const readme = await readFile(readmePath, "utf8");
	const rendered = renderTestedVersions(readme, versions);
	if (process.argv.includes("--check")) {
		if (rendered !== readme) {
			console.error(
				"README tested-versions section is stale. run: npm run docs:versions",
			);
			process.exit(1);
		}
	} else if (rendered !== readme) {
		await writeFile(readmePath, rendered);
	}
}
