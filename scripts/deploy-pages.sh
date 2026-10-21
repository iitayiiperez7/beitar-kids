#!/usr/bin/env bash
# Builds for GitHub Pages and force-pushes dist/ to the gh-pages branch.
set -euo pipefail
cd "$(dirname "$0")/.."
npm test
npm run build:pages
remote="$(git remote get-url origin)"
cd dist
touch .nojekyll
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C .. config user.name)" -c user.email="$(git -C .. config user.email)" commit -q -m "Deploy $(git -C .. rev-parse --short HEAD)"
git -c credential.helper= -c credential.helper="!gh auth git-credential" push -q -f "$remote" gh-pages
rm -rf .git
echo "Deployed to gh-pages"
