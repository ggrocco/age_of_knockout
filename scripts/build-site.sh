#!/usr/bin/env bash
# Assembles the static site GitHub Pages serves (the same files as the Dockerfile's nginx stage) into $1 (default
# _site). Used by .github/workflows/pages.yml to deploy and by CI to smoke-test exactly what gets deployed
# (test/tools/browser-smoke.js). Needs `npm ci` first for node_modules/three.
set -euo pipefail
cd "$(dirname "$0")/.."
out=${1:-_site}
rm -rf "$out"
# Pages caches every file for 10 minutes. Serve the game's own files from v/<content hash>/ so a fresh page never
# mixes old and new modules (the Dockerfile does the same through an nginx rewrite).
v=$(find index.html buildings.html ages.html styles.css src -type f | LC_ALL=C sort | xargs cat | md5sum | cut -c1-12)
mkdir -p "$out/v/$v" "$out/node_modules/three/examples"
cp index.html buildings.html ages.html favicon.svg manifest.webmanifest "$out/"
cp -r icons "$out/"
cp -r styles.css src "$out/v/$v/"
sed -i "s#href=\"styles.css\"#href=\"v/$v/styles.css\"#; s#src=\"src/#src=\"v/$v/src/#" \
  "$out/index.html" "$out/buildings.html" "$out/ages.html"
# index.html's (and the design pages') import map points at these two three.js paths
cp -r node_modules/three/build "$out/node_modules/three/"
cp -r node_modules/three/examples/jsm "$out/node_modules/three/examples/"
touch "$out/.nojekyll"
echo "Site assembled in $out (v/$v)"
