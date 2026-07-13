#!/bin/bash
# Boo Systems — Release Script (#055)
# Usage: ./scripts/release.sh [major|minor|patch]

set -e

PART=${1:-patch}
echo "🚀 Boo Systems Release — $PART"

# Get current version
CURRENT=$(grep '__version__' src/__init__.py | cut -d'"' -f2)
echo "  Current: $CURRENT"

# Bump version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
case $PART in
  major) MAJOR=$((MAJOR+1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR+1)); PATCH=0 ;;
  patch) PATCH=$((PATCH+1)) ;;
esac
NEW="$MAJOR.$MINOR.$PATCH"
echo "  New: $NEW"

# Update version
sed -i "s/__version__ = \"$CURRENT\"/__version__ = \"$NEW\"/" src/__init__.py

# Git tag
git add src/__init__.py
git commit -m "release: v$NEW" || true
git tag -a "v$NEW" -m "Boo Systems v$NEW"
git push origin main --tags

echo "✅ Released v$NEW"
