# Publishing Guide

This guide explains how to publish new versions of `@integsec/mcp-pentester-cli` to npm.

## Prerequisites

1. **npm Account**: You must have an npm account and be logged in

   ```bash
   npm login
   ```

2. **Publishing Rights**: Ensure you have publishing rights to the `@integsec/mcp-pentester-cli` package on npm

3. **Clean Working Directory**: It's recommended to commit all changes before publishing

## Quick Start

### Using the Publish Script (Recommended)

**Linux/macOS:**

```bash
chmod +x publish.sh
./publish.sh patch    # For bug fixes (1.0.0 -> 1.0.1)
./publish.sh minor    # For new features (1.0.0 -> 1.1.0)
./publish.sh major    # For breaking changes (1.0.0 -> 2.0.0)
./publish.sh 1.2.3    # For specific version
```

**Windows:**

```cmd
publish.bat patch
publish.bat minor
publish.bat major
publish.bat 1.2.3
```

The script will:

- Check npm login status
- Bump the version in `package.json`
- Build the project
- Show what will be published
- Ask for confirmation
- Publish to npm
- Provide next steps

### Manual Publishing

If you prefer to publish manually:

1. **Update the version** in `package.json`:

   ```bash
   npm version patch   # or minor, major
   # Or manually edit package.json
   ```

2. **Build the project**:

   ```bash
   npm run build
   ```

3. **Verify what will be published**:

   ```bash
   npm pack --dry-run
   ```

4. **Publish**:
   ```bash
   npm publish
   ```

## Version Numbering (Semantic Versioning)

Follow [Semantic Versioning](https://semver.org/) (semver):

- **MAJOR** (x.0.0): Breaking changes that are incompatible with previous versions
- **MINOR** (0.x.0): New features that are backward compatible
- **PATCH** (0.0.x): Bug fixes that are backward compatible

### Examples

- `1.0.0` → `1.0.1` (patch): Fixed a bug in proxy handling
- `1.0.1` → `1.1.0` (minor): Added support for new transport protocol
- `1.1.0` → `2.0.0` (major): Changed CLI command structure (breaking change)

## Pre-Publish Checklist

Before publishing, ensure:

- [ ] All tests pass (if you have tests)
- [ ] Code is built successfully (`npm run build`)
- [ ] `dist/` directory contains compiled files
- [ ] README.md is up to date
- [ ] CHANGELOG.md is updated (if you maintain one)
- [ ] Version number is correct in `package.json`
- [ ] You're logged in to npm (`npm whoami`)
- [ ] You have publishing rights to the package

## Post-Publish Steps

After successfully publishing:

1. **Create a Git Tag**:

   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

2. **Commit Version Change**:

   ```bash
   git add package.json package-lock.json
   git commit -m "chore: bump version to 1.0.1"
   git push
   ```

3. **Update Documentation**:
   - Update CHANGELOG.md with release notes
   - Update any version-specific documentation

4. **Announce Release** (optional):
   - Create a GitHub release
   - Announce in relevant channels

## Testing Before Publishing

### Test Package Locally

Before publishing, you can test the package locally:

```bash
# Create a tarball
npm pack

# This creates @integsec-mcp-pentester-cli-1.0.0.tgz
# Install it in another directory to test
cd /tmp
npm install /path/to/MCP-client/@integsec-mcp-pentester-cli-1.0.0.tgz
```

### Verify Installation

After publishing, verify the package can be installed:

```bash
# In a clean directory
npm install -g @integsec/mcp-pentester-cli
mcp-pentester-cli --version
```

## Troubleshooting

### "You do not have permission to publish"

- Ensure you're logged in: `npm login`
- Verify you have publishing rights to the package
- Check if the package name is already taken by someone else

### "Package name already exists"

- The package name `@integsec/mcp-pentester-cli` might be taken
- Ensure you have access to the `@integsec` scope on npm
- Verify you're logged in with an account that has publishing rights to the scope

### "Build fails"

- Check TypeScript compilation errors: `npm run build`
- Ensure all dependencies are installed: `npm install`
- Verify `tsconfig.json` is correct

### "Files not included in package"

- Check `.npmignore` file
- Verify `files` field in `package.json`
- Run `npm pack --dry-run` to see what will be published

## Publishing Scoped Packages

This package is published as a scoped package (`@integsec/mcp-pentester-cli`):

1. Ensure `package.json` has the scoped name:

   ```json
   {
     "name": "@integsec/mcp-pentester-cli",
     ...
   }
   ```

2. Publish with public access:
   ```bash
   npm publish --access public
   ```

## Unpublishing (Emergency Only)

⚠️ **Warning**: Unpublishing should only be done in emergencies (e.g., security issues). It can break installations for users.

```bash
# Unpublish a specific version (within 72 hours)
npm unpublish @integsec/mcp-pentester-cli@1.0.1

# Unpublish entire package (only if no other versions exist)
npm unpublish @integsec/mcp-pentester-cli --force
```

## Best Practices

1. **Always test locally** before publishing
2. **Use semantic versioning** consistently
3. **Update CHANGELOG.md** with each release
4. **Tag releases in Git** for easy reference
5. **Don't republish** the same version (use a new version instead)
6. **Test installation** after publishing
7. **Keep dependencies updated** and test before publishing

## Automated Publishing (CI/CD)

For automated publishing via CI/CD, you can:

1. Set up npm tokens as secrets
2. Use `npm version` in your CI pipeline
3. Publish automatically on tags or releases

Example GitHub Actions workflow:

```yaml
- name: Publish to npm
  if: startsWith(github.ref, 'refs/tags/v')
  run: |
    npm publish
  env:
    NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

## Support

For issues with publishing, check:

- [npm documentation](https://docs.npmjs.com/)
- [npm CLI reference](https://docs.npmjs.com/cli/v8/commands)
