import * as vscode from 'vscode'
import { emilyOutputChannel } from './extension'

// Generic definition provider that works with configurable file extensions
export class DefinitionProvider implements vscode.DefinitionProvider {
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
    const config = vscode.workspace.getConfiguration('emily')
    const languageFileExtensions = config.get<Record<string, string[]>>(
      'languageFileExtensions',
      {}
    )
    const fileExtensions = languageFileExtensions[languageId] || ['*.hs'] // fallback to .hs files

    emilyOutputChannel.appendLine(
      `Emily: Language: ${languageId}, searching in: ${fileExtensions.join(', ')}`
    )

    // Get workspace root
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folders found')
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath
    const results: vscode.Location[] = []

    // Build ripgrep command with proper patterns
    const patterns = [
      `^${identifier}\\s*=`, // Function definitions
      `^${identifier}\\s*::`, // Type signatures
      `^data\\s+${identifier}\\s+`, // Data type definitions
      `^type\\s+${identifier}\\s+`, // Type aliases
      `^newtype\\s+${identifier}\\s+`, // Newtype definitions
      `^class\\s+${identifier}\\s+`, // Class definitions
    ]

    // Create file type filters for ripgrep
    const fileFilters = fileExtensions.map((ext) => ext.replace('*', '')).join('|')

    try {
      // Use ripgrep to search efficiently
      const { exec } = require('node:child_process')
      const util = require('node:util')
      const execAsync = util.promisify(exec)

      // Check if ripgrep is available
      try {
        await execAsync('rg --version', { timeout: 5000 })
      } catch (_rgError) {
        emilyOutputChannel.appendLine(
          'Emily: ripgrep not available, falling back to VS Code search'
        )
        return this.fallbackSearch(identifier, languageId, currentFilePath)
      }

      for (const pattern of patterns) {
        const command = `rg --type-add 'haskell:*.{${fileFilters}}' --type haskell --regexp '${pattern}' --line-number --no-heading --with-filename '${workspaceRoot}'`

        try {
          const { stdout } = await execAsync(command, { timeout: 10000 })

          if (stdout.trim()) {
            const lines = stdout.trim().split('\n')
            for (const line of lines) {
              // Parse ripgrep output: filename:line:content
              const match = line.match(/^(.+):(\d+):(.+)$/)
              if (match) {
                const [, filePath, lineNum, content] = match
                const fullPath = filePath.startsWith('/')
                  ? filePath
                  : `${workspaceRoot}/${filePath}`

                // Skip the current file
                if (fullPath === currentFilePath) {
                  continue
                }

                const uri = vscode.Uri.file(fullPath)
                const lineIndex = parseInt(lineNum) - 1
                const range = new vscode.Range(lineIndex, 0, lineIndex, content.length)
                const location = new vscode.Location(uri, range)
                results.push(location)

                emilyOutputChannel.appendLine(
                  `Emily: Found definition in ${filePath} at line ${lineNum}`
                )
              }
            }
          }
        } catch (execError: any) {
          // ripgrep might not be available or might fail, log but continue
          if (execError.code !== 1) {
            // ripgrep returns 1 when no matches found
            emilyOutputChannel.appendLine(
              `Emily: ripgrep error for pattern "${pattern}": ${execError.message}`
            )
          }
        }
      }

      // Remove duplicates based on file path and line number
      const uniqueResults = results.filter((result, index, self) => {
        const key = `${result.uri.fsPath}:${result.range.start.line}`
        return self.findIndex((r) => `${r.uri.fsPath}:${r.range.start.line}` === key) === index
      })

      return uniqueResults
    } catch (error) {
      emilyOutputChannel.appendLine(`Emily: Failed to execute ripgrep: ${error}`)
      throw error
    }
  }

  // Fallback search using VS Code's built-in search when ripgrep is not available
  private async fallbackSearch(
    identifier: string,
    languageId: string,
    currentFilePath: string
  ): Promise<vscode.Location[]> {
    emilyOutputChannel.appendLine('Emily: Using fallback VS Code search')

    const config = vscode.workspace.getConfiguration('emily')
    const languageFileExtensions = config.get<Record<string, string[]>>(
      'languageFileExtensions',
      {}
    )
    const fileExtensions = languageFileExtensions[languageId] || ['*.hs']

    const results: vscode.Location[] = []

    try {
      // Create a glob pattern for all relevant file extensions
      const globPattern = `**/{${fileExtensions.join(',')}}`
      const files = await vscode.workspace.findFiles(globPattern, '**/node_modules/**')

      emilyOutputChannel.appendLine(`Emily: Found ${files.length} relevant files in workspace`)

      for (const fileUri of files) {
        // Skip the current file since we already searched it
        if (fileUri.fsPath === currentFilePath) {
          continue
        }

        try {
          const fileDocument = await vscode.workspace.openTextDocument(fileUri)

          for (let i = 0; i < fileDocument.lineCount; i++) {
            const line = fileDocument.lineAt(i)
            const lineText = line.text.trim()

            // Check for function definitions (lines with =)
            const functionPattern = new RegExp(`^${identifier}\\s*=`, 'i')
            if (functionPattern.test(lineText)) {
              const range = new vscode.Range(i, 0, i, line.text.length)
              const location = new vscode.Location(fileUri, range)
              results.push(location)
              emilyOutputChannel.appendLine(
                `Emily: Found function definition in ${fileDocument.fileName} at line ${i + 1}`
              )
            }

            // Check for type signatures (lines with ::)
            const typePattern = new RegExp(`^${identifier}\\s*::`, 'i')
            if (typePattern.test(lineText)) {
              const range = new vscode.Range(i, 0, i, line.text.length)
              const location = new vscode.Location(fileUri, range)
              results.push(location)
              emilyOutputChannel.appendLine(
                `Emily: Found type signature in ${fileDocument.fileName} at line ${i + 1}`
              )
            }

            // Also check for data type definitions
            const dataTypePattern = new RegExp(`^data\\s+${identifier}\\s+`, 'i')
            if (dataTypePattern.test(lineText)) {
              const range = new vscode.Range(i, 0, i, line.text.length)
              const location = new vscode.Location(fileUri, range)
              results.push(location)
              emilyOutputChannel.appendLine(
                `Emily: Found data type definition in ${fileDocument.fileName} at line ${i + 1}`
              )
            }

            // Check for type aliases
            const typeAliasPattern = new RegExp(`^type\\s+${identifier}\\s+`, 'i')
            if (typeAliasPattern.test(lineText)) {
              const range = new vscode.Range(i, 0, i, line.text.length)
              const location = new vscode.Location(fileUri, range)
              results.push(location)
              emilyOutputChannel.appendLine(
                `Emily: Found type alias definition in ${fileDocument.fileName} at line ${i + 1}`
              )
            }
          }
        } catch (fileError) {
          emilyOutputChannel.appendLine(`Emily: Error reading file ${fileUri.fsPath}: ${fileError}`)
          // Continue with other files
        }
      }

      return results
    } catch (error) {
      emilyOutputChannel.appendLine(`Emily: Error in fallback search: ${error}`)
      return []
    }
  }
}
