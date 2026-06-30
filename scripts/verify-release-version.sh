#!/usr/bin/env bash
set -euo pipefail

tag="${1:?usage: verify-release-version.sh <tag> <package-version>}"
package_version="${2:?usage: verify-release-version.sh <tag> <package-version>}"

tag_version="${tag#v}"

if [[ "${tag_version}" != "${package_version}" ]]; then
	echo "release tag ${tag} does not match package.json version ${package_version}" >&2
	exit 1
fi

echo "release tag ${tag} matches package.json version ${package_version}"
