#!/bin/bash

# MCP Pentester CLI - Publish Script
# This script helps publish new versions to npm

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if version type is provided
if [ -z "$1" ]; then
    print_error "Usage: ./publish.sh [patch|minor|major|version]"
    echo ""
    echo "Examples:"
    echo "  ./publish.sh patch    # Bump patch version (1.0.0 -> 1.0.1)"
    echo "  ./publish.sh minor    # Bump minor version (1.0.0 -> 1.1.0)"
    echo "  ./publish.sh major    # Bump major version (1.0.0 -> 2.0.0)"
    echo "  ./publish.sh 1.2.3    # Set specific version"
    exit 1
fi

VERSION_TYPE=$1

# Check if git is clean (optional but recommended)
if ! git diff-index --quiet HEAD --; then
    print_warn "You have uncommitted changes. Consider committing them first."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Publishing cancelled."
        exit 1
    fi
fi

# Check if logged in to npm
print_info "Checking npm login status..."
if ! npm whoami &> /dev/null; then
    print_error "Not logged in to npm. Please run: npm login"
    exit 1
fi

NPM_USER=$(npm whoami)
print_info "Logged in as: $NPM_USER"

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_info "Current version: $CURRENT_VERSION"

# Determine new version
if [[ "$VERSION_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    NEW_VERSION=$VERSION_TYPE
    print_info "Setting version to: $NEW_VERSION"
else
    print_info "Bumping $VERSION_TYPE version..."
    NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version | sed 's/v//')
    print_info "New version: $NEW_VERSION"
fi

# Build the project
print_info "Building project..."
npm run build

if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    print_error "Build failed or dist directory is empty!"
    exit 1
fi

print_info "Build successful!"

# Run tests if test script exists (optional)
if npm run test --if-present 2>/dev/null; then
    print_info "Tests passed!"
else
    print_warn "No tests to run or tests failed (continuing anyway)"
fi

# Show what will be published
print_info "Files to be published:"
npm pack --dry-run 2>/dev/null | grep -E "^(npm notice|added)" | head -20

# Confirm before publishing
echo ""
print_warn "Ready to publish version $NEW_VERSION to npm"
read -p "Continue with publish? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Publishing cancelled."
    # Revert version change
    npm version $CURRENT_VERSION --no-git-tag-version
    exit 1
fi

# Publish to npm (with public access for scoped package)
print_info "Publishing to npm..."
npm publish --access public

if [ $? -eq 0 ]; then
    print_info "Successfully published version $NEW_VERSION!"
    echo ""
    print_info "Next steps:"
    echo "  1. Create a git tag: git tag v$NEW_VERSION"
    echo "  2. Push tags: git push origin v$NEW_VERSION"
    echo "  3. Update CHANGELOG.md with release notes"
    echo "  4. Commit version change: git add package.json && git commit -m \"chore: bump version to $NEW_VERSION\""
    echo "  5. Push changes: git push"
else
    print_error "Publishing failed!"
    # Revert version change
    npm version $CURRENT_VERSION --no-git-tag-version
    exit 1
fi

