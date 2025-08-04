import * as vscode from 'vscode'
import { cycleEmoji } from './emojiCycler'
import { HaskellDefinitionProvider } from './haskellDefinitionProvider'

// Create a global output channel for the extension
export let emilyOutputChannel: vscode.OutputChannel

export function activate(context: vscode.ExtensionContext) {
  // Create the output channel
  emilyOutputChannel = vscode.window.createOutputChannel('Emily')
  emilyOutputChannel.appendLine('Emily VSCode Extension is now active!')

  // Register the Haskell definition provider
  const haskellDefinitionProvider = new HaskellDefinitionProvider()
  const definitionProviderDisposable = vscode.languages.registerDefinitionProvider(
    { language: 'haskell' },
    haskellDefinitionProvider
  )
  context.subscriptions.push(definitionProviderDisposable)

  // Register the emoji cycling command
  const emojiCommandDisposable = vscode.commands.registerCommand('emily.cycleEmoji', () => {
    cycleEmoji()
  })

  context.subscriptions.push(emojiCommandDisposable)
}

export function deactivate() {}
