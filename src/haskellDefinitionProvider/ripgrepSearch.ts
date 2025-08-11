import * as vscode from 'vscode'
import { emilyOutputChannel } from '../extension'

export class RipgrepSearch {
  async search(
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

    emilyOutputChannel.appendLine(`Emily: Searching for patterns: ${patterns.join(', ')}`)

    // Create file type filters for ripgrep
    const fileFilters = fileExtensions.map((ext) => ext.replace('*', '')).join('|')
    emilyOutputChannel.appendLine(`Emily: File extensions filter: ${fileFilters}`)

    try {
      // Use ripgrep to search efficiently
      const { exec } = require('node:child_process')
      const util = require('node:util')
      const execAsync = util.promisify(exec)

      // Check if ripgrep is available
      try {
        const { stdout: versionOutput } = await execAsync('rg --version', { timeout: 5000 })
        emilyOutputChannel.appendLine(
          `Emily: ripgrep version: ${versionOutput.trim().split('\n')[0]}`
        )
      } catch (_rgError) {
        emilyOutputChannel.appendLine(
          'Emily: ripgrep not available, falling back to VS Code search'
        )
        throw new Error('ripgrep not available')
      }

      for (const pattern of patterns) {
        const command = `rg --glob '*.{${fileFilters}}' --regexp '${pattern}' --line-number --no-heading --with-filename '${workspaceRoot}'`

        emilyOutputChannel.appendLine(`Emily: Executing ripgrep:`)
        emilyOutputChannel.appendLine(`  ${command}`)

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
}
