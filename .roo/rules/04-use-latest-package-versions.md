# Use Latest Package Versions

## Critical Rule

**ALWAYS use the latest stable versions of packages when installing dependencies.**

Do NOT install outdated versions. Before installing any package:

1. Check the latest version available
2. Install the latest stable version (not alpha/beta/rc unless specifically requested)
3. If a major version was released recently, verify it's stable and not breaking

## Examples

### WRONG - Installing outdated versions:
```bash
# ❌ DON'T specify old versions without reason
pnpm add prisma@6
pnpm add next@14
pnpm add react@18
```

### CORRECT - Installing latest versions:
```bash
# ✅ DO install latest versions
pnpm add prisma@latest
pnpm add next@latest
pnpm add react@latest

# Or specify the actual latest version
pnpm add prisma@7
pnpm add next@16
pnpm add react@19
```

## Verification Steps

Before installing packages, verify latest versions:

1. **npm registry**: `npm view <package> version`
2. **GitHub releases**: Check the releases page
3. **Documentation**: Check official docs for current version
4. **Search**: Use web search to confirm latest stable version

## Exceptions

Only use older versions when:
- User explicitly requests a specific version
- There's a documented incompatibility with other project dependencies
- The latest version has known critical bugs (document the reason)

## Package Manager Commands

```bash
# Check outdated packages
pnpm outdated

# Update all packages to latest
pnpm update --latest

# Install specific latest major version
pnpm add package@7  # Gets latest 7.x.x
```

## Responsibility

When setting up new projects or adding dependencies, it is YOUR responsibility to:
1. Research current package versions
2. Install the latest stable versions
3. Keep the project modern and up-to-date
4. Not waste time with outdated packages that will need immediate upgrades
