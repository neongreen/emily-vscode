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

    // If not found in current document, search in other files in the workspace
    if (definitions.length === 0) {
      emilyOutputChannel.appendLine(`Emily: Not found in current file, searching workspace...`)

      // Get the language ID and corresponding file extensions
      const languageId = document.languageId
      const config = vscode.workspace.getConfiguration('emily')
      const languageFileExtensions = config.get<Record<string, string[]>>('languageFileExtensions', {})
      const fileExtensions = languageFileExtensions[languageId] || ['*.hs'] // fallback to .hs files

      emilyOutputChannel.appendLine(`Emily: Language: ${languageId}, searching in: ${fileExtensions.join(', ')}`)

      // Return a promise that will resolve with the definitions
      return new Promise<vscode.Location[]>((resolve) => {
        // Create a glob pattern for all relevant file extensions
        const globPattern = `**/{${fileExtensions.join(',')}}`
        vscode.workspace.findFiles(globPattern, '**/node_modules/**').then((files) => {
          emilyOutputChannel.appendLine(
            `Emily: Found ${files.length} relevant files in workspace`
          )

          let filesProcessed = 0
          const totalFiles = files.filter((uri) => uri.fsPath !== document.uri.fsPath).length
          const crossFileDefinitions: vscode.Location[] = []
          const crossFileTypeSignatures: vscode.Location[] = []

          if (totalFiles === 0) {
            emilyOutputChannel.appendLine(`Emily: Found ${definitions.length} definition(s) total`)
            resolve(definitions)
            return
          }

          for (const fileUri of files) {
            // Skip the current file since we already searched it
            if (fileUri.fsPath === document.uri.fsPath) {
              continue
            }

            vscode.workspace.openTextDocument(fileUri).then(
              (fileDocument) => {
                emilyOutputChannel.appendLine(`Emily: Searching in ${fileDocument.fileName}`)

                for (let i = 0; i < fileDocument.lineCount; i++) {
                  const line = fileDocument.lineAt(i)
                  const lineText = line.text.trim()

                  // Check for function definitions (lines with =)
                  const functionPattern = new RegExp(`^${identifier}\\s*=`, 'i')
                  if (functionPattern.test(lineText)) {
                    const range = new vscode.Range(i, 0, i, line.text.length)
                    const location = new vscode.Location(fileUri, range)
                    crossFileDefinitions.push(location)
                    emilyOutputChannel.appendLine(
                      `Emily: Found function definition in ${fileDocument.fileName} at line ${i + 1}`
                    )
                  }

                  // Check for type signatures (lines with ::)
                  const typePattern = new RegExp(`^${identifier}\\s*::`, 'i')
                  if (typePattern.test(lineText)) {
                    const range = new vscode.Range(i, 0, i, line.text.length)
                    const location = new vscode.Location(fileUri, range)
                    crossFileTypeSignatures.push(location)
                    emilyOutputChannel.appendLine(
                      `Emily: Found type signature in ${fileDocument.fileName} at line ${i + 1}`
                    )
                  }

                  // Also check for data type definitions
                  const dataTypePattern = new RegExp(`^data\\s+${identifier}\\s+`, 'i')
                  if (dataTypePattern.test(lineText)) {
                    const range = new vscode.Range(i, 0, i, line.text.length)
                    const location = new vscode.Location(fileUri, range)
                    definitions.push(location)
                    emilyOutputChannel.appendLine(
                      `Emily: Found data type definition in ${fileDocument.fileName} at line ${i + 1}`
                    )
                  }

                  // Check for type aliases
                  const typeAliasPattern = new RegExp(`^type\\s+${identifier}\\s+`, 'i')
                  if (typeAliasPattern.test(lineText)) {
                    const range = new vscode.Range(i, 0, i, line.text.length)
                    const location = new vscode.Location(fileUri, range)
                    definitions.push(location)
                    emilyOutputChannel.appendLine(
                      `Emily: Found type alias definition in ${fileDocument.fileName} at line ${i + 1}`
                    )
                  }
                }

                filesProcessed++
                if (filesProcessed === totalFiles) {
                  // Prioritize type signatures over function definitions
                  const allResults = [...crossFileTypeSignatures, ...crossFileDefinitions]
                  emilyOutputChannel.appendLine(
                    `Emily: Found ${allResults.length} definition(s) total`
                  )
                  resolve(allResults)
                }
              },
              (error: any) => {
                emilyOutputChannel.appendLine(
                  `Emily: Error reading file ${fileUri.fsPath}: ${error}`
                )
                filesProcessed++
                if (filesProcessed === totalFiles) {
                  // Prioritize type signatures over function definitions
                  const allResults = [...crossFileTypeSignatures, ...crossFileDefinitions]
                  emilyOutputChannel.appendLine(
                    `Emily: Found ${allResults.length} definition(s) total`
                  )
                  resolve(allResults)
                }
              }
            )
          }
        })
      })
    }

    emilyOutputChannel.appendLine(`Emily: Found ${definitions.length} definition(s) total`)
    return definitions.length > 0 ? definitions : null
  }
}
