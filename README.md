# Emily VSCode

A VS Code extension that cycles through emojis in markdown headers.

## Features

- Cycle through configured emojis in markdown headers
- Customizable emoji list through settings
- Works with all markdown header levels (#, ##, ###, etc.)

## Usage

1. Open a markdown file
2. Place your cursor on a header line (e.g., `# My Header`)
3. Run the command "Cycle Emoji in Header" (you can bind this to a keyboard shortcut)
4. The extension will cycle through your configured emojis:
   - First press: Adds the first emoji (`# ☐ My Header`)
   - Second press: Replaces with second emoji (`# ❌ My Header`)
   - Continue cycling through all emojis
   - After the last emoji, it removes all emojis and goes back to plain header

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
