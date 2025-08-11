import { execa } from 'execa'
import * as vscode from 'vscode'
import { emilyOutputChannel } from '../extension'
import {
  buildPatterns,
  searchFolderWithRipgrep,
  searchTextWithRipgrep as searchTextWithRipgrepCore,
} from './ripgrepCore'

export class RipgrepSearch {
  async searchInCurrentBuffer(
    identifier: string,
    document: vscode.TextDocument
  ): Promise<vscode.Location[]> {
    const content = document.getText()
    if (!content) return []

    const coreResults = await searchTextWithRipgrepCore(identifier, content)
    const mapped = coreResults.map(({ lineIndex, lineText }) => {
      const range = new vscode.Range(lineIndex, 0, lineIndex, lineText.length)
      return new vscode.Location(document.uri, range)
    })

    return mapped
  }

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
    const patterns = buildPatterns(identifier)

    emilyOutputChannel.appendLine(`Emily: Searching for patterns: ${patterns.join(', ')}`)

    // Create file type filters for ripgrep
    const fileFilters = fileExtensions.map((ext) => ext.replace('*', '')).join(',')
    emilyOutputChannel.appendLine(`Emily: File extensions filter: ${fileFilters}`)

    try {
      // Check if ripgrep is available
      try {
        const { stdout: versionOutput } = await execa('rg', ['--version'], { timeout: 5000 })
        emilyOutputChannel.appendLine(
          `Emily: ripgrep version: ${versionOutput.trim().split('\n')[0]}`
        )
      } catch (_rgError) {
        emilyOutputChannel.appendLine(
          'Emily: ripgrep (rg) is not available in PATH. This extension requires ripgrep to function.'
        )
        throw new Error('ripgrep is required but not available in PATH')
      }

      const matches = await searchFolderWithRipgrep(identifier, workspaceRoot, fileFilters)
      for (const m of matches) {
        const fullPath = m.filePath.startsWith('/') ? m.filePath : `${workspaceRoot}/${m.filePath}`
        if (fullPath === currentFilePath) continue
        const uri = vscode.Uri.file(fullPath)
        const range = new vscode.Range(
          m.lineIndex,
          0,
          m.lineIndex,
          m.lineText.replace(/\r?\n$/, '').length
        )
        results.push(new vscode.Location(uri, range))
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

export async function searchTextWithRipgrep(
  identifier: string,
  content: string
): Promise<Array<{ lineIndex: number; lineText: string }>> {
  return searchTextWithRipgrepCore(identifier, content)
}
