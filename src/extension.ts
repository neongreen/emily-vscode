import { execa } from 'execa'
import * as vscode from 'vscode'
import { dumpAllDefinitions } from './commands/dumpDefinitions'
import { cycleEmoji } from './emojiCycler'
import { DefinitionProvider } from './haskellDefinitionProvider'

// Create a global output channel for the extension
export let emilyOutputChannel: vscode.OutputChannel

// Keep track of definition provider disposables
const definitionProviderDisposables: vscode.Disposable[] = []

export async function activate(context: vscode.ExtensionContext) {
  // Create the output channel
  emilyOutputChannel = vscode.window.createOutputChannel('Emily')
  emilyOutputChannel.appendLine('Emily VSCode Extension is now active!')

  // Preflight: ensure ripgrep is available in PATH
  const ripgrepOk = await checkRipgrepAvailability()
  if (!ripgrepOk) {
    const message =
      'Emily: ripgrep (rg) is required but was not found in PATH. Please install ripgrep. On macOS: brew install ripgrep.'
    emilyOutputChannel.appendLine(message)
    vscode.window.showErrorMessage(message)
    // Do not register providers/commands if rg is missing
    return
  }

  // Register the definition provider for all configured languages
  const definitionProvider = new DefinitionProvider()

  // Function to register definition providers for configured languages
  const registerDefinitionProviders = () => {
    // Clear existing definition provider disposables
    definitionProviderDisposables.forEach((disposable) => disposable.dispose())
    definitionProviderDisposables.length = 0

    const config = vscode.workspace.getConfiguration('emily')
    const languageFileExtensions = config.get<Record<string, string[]>>(
      'languageFileExtensions',
      {}
    )

    // Register definition providers for each configured language
    Object.keys(languageFileExtensions).forEach((languageId) => {
      const disposable = vscode.languages.registerDefinitionProvider(
        { language: languageId },
        definitionProvider
      )
      definitionProviderDisposables.push(disposable)
      emilyOutputChannel.appendLine(
        `Emily: Registered definition provider for language: ${languageId}`
      )
    })
  }

  // Initial registration
  registerDefinitionProviders()

  // Listen for configuration changes and re-register providers
  const configChangeListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('emily.languageFileExtensions')) {
      emilyOutputChannel.appendLine('Emily: Language mappings changed, re-registering providers...')
      registerDefinitionProviders()
    }
  })
  context.subscriptions.push(configChangeListener)

  // Register the emoji cycling command
  const emojiCommandDisposable = vscode.commands.registerCommand('emily.cycleEmoji', () => {
    cycleEmoji()
  })

  context.subscriptions.push(emojiCommandDisposable)

  // Register the developer command to dump all definitions
  const dumpDefinitionsCommandDisposable = vscode.commands.registerCommand(
    'emily.dumpDefinitions',
    async () => {
      await dumpAllDefinitions()
    }
  )

  context.subscriptions.push(dumpDefinitionsCommandDisposable)
}

export function deactivate() {
  // Clean up definition provider disposables
  if (definitionProviderDisposables) {
    definitionProviderDisposables.forEach((disposable) => disposable.dispose())
  }
}

async function checkRipgrepAvailability(): Promise<boolean> {
  try {
    const { stdout } = await execa('rg', ['--version'], { timeout: 5000 })
    emilyOutputChannel.appendLine(`Emily: ripgrep available: ${stdout.trim().split('\n')[0]}`)
    return true
  } catch {
    return false
  }
}
