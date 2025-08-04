# Emily VSCode

A VS Code extension with multiple features including emoji cycling in markdown headers and Haskell jump-to-definition support.

## Features

- **Emoji Cycling**: Cycle through configured emojis in markdown headers
- **Haskell Jump to Definition**: Simple regex-based jump-to-definition for Haskell files (lightweight alternative to language server)
- Customizable emoji list through settings
- Works with all markdown header levels (#, ##, ###, etc.)

## Usage

### Emoji Cycling

1. Open a markdown file
2. Place your cursor on a header line (e.g., `# My Header`)
3. Run the command "Cycle Emoji in Header" (you can bind this to a keyboard shortcut)
4. The extension will cycle through your configured emojis:
   - First press: Adds the first emoji (`# ☐ My Header`)
   - Second press: Replaces with second emoji (`# ❌ My Header`)
   - Continue cycling through all emojis
   - After the last emoji, it removes all emojis and goes back to plain header

### Haskell Jump to Definition

1. Open a Haskell file (`.hs` or `.lhs`)
2. Place your cursor on any function name
3. Use `F12` or `Cmd/Ctrl + Click` to jump to definition
4. The extension will find all lines that start with that identifier followed by `::` or `=`

**Note**: This feature assumes you already have the Haskell extension installed for syntax highlighting. It provides a lightweight alternative when a full language server is not available.

## Configuration

You can customize the emojis by adding this to your VS Code settings:

```json
{
  "emily.emojis": ["☐", "❌", "🟢", "🟡", "🔴"]
}
```

## Development

```bash
# Install dependencies
pnpm install

# Compile the extension
pnpm run compile

# Watch for changes
pnpm run watch
```

## Installation

1. Clone this repository
2. Run `pnpm install`
3. Run `pnpm run compile`
4. Press F5 in VS Code to launch the extension in a new Extension Development Host window
5. Open a markdown file and test the "Cycle Emoji in Header" command

## Releases

This project uses GitHub Actions for automated builds and releases:

### 🚀 **Development Builds** (Every Push to Main)
- **Trigger**: Every push to `main` branch
- **What it does**: 
  - Runs tests and linting
  - Builds the extension
  - Creates a VSIX package
  - Uploads VSIX as a GitHub artifact (30-day retention)
  - Creates a development release with tag `dev-<commit-sha>`
- **Purpose**: Always have the latest version available for testing

### 🏷️ **Stable Releases** (Tagged Versions)
- **Trigger**: When you push a tag starting with `v` (e.g., `v1.0.0`)
- **What it does**:
  - Runs tests and linting
  - Builds the extension
  - Creates a VSIX package
  - Publishes a stable GitHub release with the VSIX file attached
- **Purpose**: Official releases for distribution

**Note**: Both workflows create VSIX files for manual installation only. They do NOT publish to the VS Code Marketplace.

To create a release:

```bash
# Option 1: Use the release script (recommended)
./scripts/release.sh patch  # for 1.0.0 -> 1.0.1
./scripts/release.sh minor  # for 1.0.0 -> 1.1.0
./scripts/release.sh major  # for 1.0.0 -> 2.0.0

# Option 2: Manual process
# Update version in package.json
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0
```

### 📦 **Installing VSIX Files**

VSIX files are available in two places:

1. **Development Builds**: GitHub releases with tags like `dev-<commit-sha>`
2. **Stable Releases**: GitHub releases with tags like `v1.0.0`

To install a VSIX file:
1. Download the VSIX file from the GitHub release
2. Open VS Code
3. Go to Extensions (Ctrl+Shift+X)
4. Click the "..." menu and select "Install from VSIX..."
5. Select the downloaded VSIX file

**Pro tip**: For development, you can always get the latest version from the most recent development release!

## Development

The project includes CI/CD workflows:

- **CI**: Runs on pull requests and pushes to main/master branch
  - Installs dependencies
  - Runs tests
  - Lints code
  - Checks formatting
  - Builds the extension

- **Build VSIX (Development)**: Runs on every push to main/master
  - Performs all CI checks
  - Creates VSIX package
  - Uploads VSIX as artifact
  - Creates development release with `dev-<commit-sha>` tag

- **Release (Stable)**: Runs when tags are pushed
  - Performs all CI checks
  - Creates VSIX package
  - Publishes stable GitHub release (VSIX file only, no marketplace publishing)
