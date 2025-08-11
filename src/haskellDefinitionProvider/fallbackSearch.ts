import * as vscode from 'vscode'
import { emilyOutputChannel } from '../extension'

export class FallbackSearch {
  async search(
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
