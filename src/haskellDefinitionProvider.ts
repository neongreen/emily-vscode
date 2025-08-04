import * as vscode from 'vscode'
import { emilyOutputChannel } from './extension'

// Haskell jump to definition provider
export class HaskellDefinitionProvider implements vscode.DefinitionProvider {
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

    // Search in the current document first
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i)
      const lineText = line.text.trim()

      // Check if line starts with the identifier (Haskell function definition pattern)
      // This regex matches lines that start with the identifier followed by whitespace, ::, or =
      const definitionPattern = new RegExp(`^${identifier}\\s*(::|=)`, 'i')

      if (definitionPattern.test(lineText)) {
        const range = new vscode.Range(i, 0, i, line.text.length)
        const location = new vscode.Location(document.uri, range)
        definitions.push(location)
      }
    }

    // If not found in current document, search in other Haskell files in the workspace
    if (definitions.length === 0) {
      emilyOutputChannel.appendLine(`Emily: Not found in current file, searching workspace...`)

      // Return a promise that will resolve with the definitions
      return new Promise<vscode.Location[]>((resolve) => {
        vscode.workspace.findFiles('**/*.hs', '**/node_modules/**').then((haskellFiles) => {
          emilyOutputChannel.appendLine(
            `Emily: Found ${haskellFiles.length} Haskell files in workspace`
          )

          let filesProcessed = 0
          const totalFiles = haskellFiles.filter((uri) => uri.fsPath !== document.uri.fsPath).length

          if (totalFiles === 0) {
            emilyOutputChannel.appendLine(`Emily: Found ${definitions.length} definition(s) total`)
            resolve(definitions)
            return
          }

          for (const fileUri of haskellFiles) {
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

                  // Check for function definitions
                  const definitionPattern = new RegExp(`^${identifier}\\s*(::|=)`, 'i')
                  if (definitionPattern.test(lineText)) {
                    const range = new vscode.Range(i, 0, i, line.text.length)
                    const location = new vscode.Location(fileUri, range)
                    definitions.push(location)
                    emilyOutputChannel.appendLine(
                      `Emily: Found definition in ${fileDocument.fileName} at line ${i + 1}`
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
                  emilyOutputChannel.appendLine(
                    `Emily: Found ${definitions.length} definition(s) total`
                  )
                  resolve(definitions)
                }
              },
              (error: any) => {
                emilyOutputChannel.appendLine(
                  `Emily: Error reading file ${fileUri.fsPath}: ${error}`
                )
                filesProcessed++
                if (filesProcessed === totalFiles) {
                  emilyOutputChannel.appendLine(
                    `Emily: Found ${definitions.length} definition(s) total`
                  )
                  resolve(definitions)
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
