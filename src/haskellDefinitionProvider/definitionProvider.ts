import type * as vscode from 'vscode'
import { emilyOutputChannel } from '../extension'
import { RipgrepSearch } from './ripgrepSearch'

// Generic definition provider that works with configurable file extensions
export class DefinitionProvider implements vscode.DefinitionProvider {
  private ripgrepSearch: RipgrepSearch

  constructor() {
    this.ripgrepSearch = new RipgrepSearch()
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

    // First phase: search current buffer via ripgrep (stdin)
    return new Promise<vscode.Location[]>((resolve) => {
      this.ripgrepSearch
        .searchInCurrentBuffer(identifier, document)
        .then((currentFileResults) => {
          if (currentFileResults.length > 0) {
            emilyOutputChannel.appendLine(
              `Emily: Found ${currentFileResults.length} definition(s) in current buffer`
            )
            resolve(currentFileResults)
            return
          }

          // Second phase: search other files via ripgrep
          emilyOutputChannel.appendLine(
            `Emily: Not found in current buffer, searching workspace with ripgrep...`
          )
          this.searchWithRipgrep(identifier, document.languageId, document.uri.fsPath)
            .then((crossFileResults) => {
              emilyOutputChannel.appendLine(
                `Emily: Found ${crossFileResults.length} cross-file definition(s)`
              )
              resolve(crossFileResults)
            })
            .catch((error) => {
              emilyOutputChannel.appendLine(`Emily: Error during ripgrep search: ${error}`)
              resolve([])
            })
        })
        .catch((error) => {
          emilyOutputChannel.appendLine(
            `Emily: Error during ripgrep current-buffer search: ${error}`
          )
          resolve([])
        })
    })
  }

  private async searchWithRipgrep(
    identifier: string,
    languageId: string,
    currentFilePath: string
  ): Promise<vscode.Location[]> {
    return await this.ripgrepSearch.search(identifier, languageId, currentFilePath)
  }
}
