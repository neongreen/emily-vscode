#!/bin/bash

# Release script for Emily VS Code extension
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 [patch|minor|major]"
    echo "  patch: 1.0.0 -> 1.0.1"
    echo "  minor: 1.0.0 -> 1.1.0"
    echo "  major: 1.0.0 -> 2.0.0"
    exit 1
fi

VERSION_TYPE=$1

# Check if we're on main/master branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo "Error: Must be on main branch to release"
    exit 1
fi

# Check if working directory is clean
if [[ -n $(git status --porcelain) ]]; then
    echo "Error: Working directory is not clean. Please commit or stash changes."
    exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Calculate new version
NEW_VERSION=$(pnpm version "$VERSION_TYPE" --no-git-tag-version)
echo "New version: $NEW_VERSION"

# Update package.json version
node -e "
const pkg = require('./package.json');
pkg.version = '$NEW_VERSION';
require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Commit version bump
git add package.json
git commit -m "chore: bump version to $NEW_VERSION"

# Create and push tag
git tag "v$NEW_VERSION"
git push origin main
git push origin "v$NEW_VERSION"

echo "✅ Release $NEW_VERSION created and pushed!"
echo "GitHub Actions will automatically build and publish the release." 