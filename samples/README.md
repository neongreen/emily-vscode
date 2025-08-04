# Haskell Jump to Definition Samples

This folder contains sample files to test the Haskell jump to definition feature.

## About This Extension

This extension provides a simple jump-to-definition feature for Haskell files using regex-based pattern matching. It's designed as a lightweight alternative when you don't have a full Haskell language server available.

**Note:** This extension assumes you already have the Haskell extension installed for syntax highlighting and basic language support.

## Files

- `test.hs` - A sample Haskell file with various function definitions
- `test.md` - The original test markdown file

## How to Test

1. Open `test.hs` in VS Code
2. Place your cursor on any function name (e.g., `factorial`, `fibonacci`, `isEven`)
3. Use `F12` or `Cmd/Ctrl + Click` to jump to definition
4. The extension will find all lines that start with that identifier followed by `::` or `=`

## Supported Patterns

The jump to definition provider recognizes these Haskell patterns:

- Function definitions: `functionName :: Type`
- Function implementations: `functionName = expression`
- Pattern matching: `functionName pattern = expression`
- Type definitions: `type TypeName = ...`
- Data definitions: `data TypeName = ...`

## Example

In `test.hs`, if you place your cursor on `factorial` and jump to definition, it will find:
- Line 5: `factorial :: Integer -> Integer`
- Line 6: `factorial 0 = 1`
- Line 7: `factorial n = n * factorial (n - 1)` 