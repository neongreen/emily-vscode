import * as vscode from 'vscode'
import { emilyOutputChannel } from '../extension'
import { FallbackSearch } from './fallbackSearch'
import { RipgrepSearch } from './ripgrepSearch'

// Generic definition provider that works with configurable file extensions
export class DefinitionProvider implements vscode.DefinitionProvider {
  private ripgrepSearch: RipgrepSearch
  private fallbackSearch: FallbackSearch

  constructor() {
    this.ripgrepSearch = new RipgrepSearch()
    this.fallbackSearch = new FallbackSearch()
  }

  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Definition | vscode.DefinitionLink[]> {
    emilyOutputChannel.appendLine('Emily: Definition provider called')

    // Get the word at the current position
    const wordRange = document.getWordRangeAtPosition(position)
    if (!wordRange) {
      emilyOutputChannel.appendLine('Emily: No word range found at position')
      return null
    }

    const identifier = document.getText(wordRange)
    emilyOutputChannel.appendLine(
      `Emily: Looking for definition of "${identifier}" in ${document.fileName}`
    )

    // Find all lines that start with this identifier (potential definitions)
    const definitions: vscode.Location[] = []
    const typeSignatures: vscode.Location[] = []

    // Search in the current document first
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i)
      const lineText = line.text.trim()

      // Check for function definitions (lines with =)
      const functionPattern = new RegExp(`^${identifier}\\s*=`, 'i')
      if (functionPattern.test(lineText)) {
        const range = new vscode.Range(i, 0, i, line.text.length)
        const location = new vscode.Location(document.uri, range)
        definitions.push(location)
        emilyOutputChannel.appendLine(`Emily: Found function definition at line ${i + 1}`)
      }

      // Check for type signatures (lines with ::)
      const typePattern = new RegExp(`^${identifier}\\s*::`, 'i')
      if (typePattern.test(lineText)) {
        const range = new vscode.Range(i, 0, i, line.text.length)
        const location = new vscode.Location(document.uri, range)
        typeSignatures.push(location)
        emilyOutputChannel.appendLine(`Emily: Found type signature at line ${i + 1}`)
      }
    }

    // If we found type signatures, return those. Otherwise, return function definitions.
    if (typeSignatures.length > 0) {
      return typeSignatures
    } else if (definitions.length > 0) {
      return definitions
    }

    // If not found in current document, search in other files in the workspace using ripgrep
    if (definitions.length === 0) {
      emilyOutputChannel.appendLine(
        `Emily: Not found in current file, searching workspace with ripgrep...`
      )

      // Return a promise that will resolve with the definitions
      return new Promise<vscode.Location[]>((resolve) => {
        this.searchWithRipgrep(identifier, document.languageId, document.uri.fsPath)
          .then((crossFileResults) => {
            // Prioritize type signatures over function definitions
            const allResults = [...crossFileResults]

            emilyOutputChannel.appendLine(`Emily: Found ${allResults.length} definition(s) total`)
            resolve(allResults)
          })
          .catch((error) => {
            emilyOutputChannel.appendLine(`Emily: Error during ripgrep search: ${error}`)
            // Fall back to empty results
            resolve([])
          })
      })
    }

    emilyOutputChannel.appendLine(`Emily: Found ${definitions.length} definition(s) total`)
    return definitions.length > 0 ? definitions : null
  }

  private async searchWithRipgrep(
    identifier: string,
    languageId: string,
    currentFilePath: string
  ): Promise<vscode.Location[]> {
    try {
      return await this.ripgrepSearch.search(identifier, languageId, currentFilePath)
    } catch (error) {
      emilyOutputChannel.appendLine(
        `Emily: Ripgrep search failed, falling back to VS Code search: ${error}`
      )
      return await this.fallbackSearch.search(identifier, languageId, currentFilePath)
    }
  }
}
