import * as vscode from 'vscode'
import { emilyOutputChannel } from '../extension'
import { HaskellDefinitionProvider } from '../haskellDefinitionProvider'

// Developer command to dump all definitions for identifiers in the current file
export async function dumpAllDefinitions() {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage('No active editor')
    return
  }

  const document = editor.document
  if (document.languageId !== 'haskell') {
    vscode.window.showErrorMessage('Current file is not a Haskell file')
    return
  }

  emilyOutputChannel.appendLine('=== Starting definition dump ===')

  // Get all identifiers in the document
  const identifiers = new Set<string>()
  const documentText = document.getText()

  // Simple regex to find potential identifiers (words that start with lowercase letters)
  const identifierRegex = /\b[a-z][a-zA-Z0-9_']*\b/g
  let match: RegExpExecArray | null

  while (true) {
    match = identifierRegex.exec(documentText)
    if (match === null) break
    identifiers.add(match[0])
  }

  emilyOutputChannel.appendLine(
    `Found ${identifiers.size} potential identifiers: ${Array.from(identifiers).join(', ')}`
  )

  // Create a new document to dump results
  const dumpDocument = await vscode.workspace.openTextDocument({
    content: `# Definition Dump for ${document.fileName}\n\nGenerated on: ${new Date().toISOString()}\n\n`,
    language: 'markdown',
  })

  const dumpEditor = await vscode.window.showTextDocument(dumpDocument, vscode.ViewColumn.Beside)

  let dumpContent = `# Definition Dump for ${document.fileName}\n\nGenerated on: ${new Date().toISOString()}\n\n## Definitions Found\n\n`

  // Track identifiers with and without definitions
  const identifiersWithDefinitions: string[] = []
  const identifiersWithoutDefinitions: string[] = []

  // For each identifier, find all definitions
  for (const identifier of identifiers) {
    emilyOutputChannel.appendLine(`\n--- Processing identifier: ${identifier} ---`)

    // Find all occurrences of this identifier in the document
    const identifierRegex = new RegExp(`\\b${identifier}\\b`, 'g')
    const documentText = document.getText()
    const matches: number[] = []
    let match: RegExpExecArray | null

    while (true) {
      match = identifierRegex.exec(documentText)
      if (match === null) break
      matches.push(match.index)
    }

    if (matches.length === 0) {
      dumpContent += `**No occurrences found in current file**\n\n`
      emilyOutputChannel.appendLine(`  No occurrences found in current file`)
      dumpContent += `---\n\n`
      continue
    }

    // Test the definition provider for each occurrence
    const definitionProvider = new HaskellDefinitionProvider()
    const allDefinitions = new Set<string>() // Use Set to avoid duplicates

    for (const matchIndex of matches) {
      // Convert character index to line and character position
      const position = document.positionAt(matchIndex)

      try {
        const definitions = await definitionProvider.provideDefinition(
          document,
          position,
          {} as vscode.CancellationToken
        )

        if (definitions && Array.isArray(definitions) && definitions.length > 0) {
          // Add definitions to our set to avoid duplicates
          for (const definition of definitions) {
            const uri = 'uri' in definition ? definition.uri : definition.targetUri
            const range = 'range' in definition ? definition.range : definition.targetRange
            const key = `${uri.fsPath}:${range.start.line + 1}`
            allDefinitions.add(key)
          }
        }
      } catch (error) {
        emilyOutputChannel.appendLine(`  Error at position ${matchIndex}: ${error}`)
      }
    }

    // Now process all unique definitions found
    if (allDefinitions.size > 0) {
      identifiersWithDefinitions.push(identifier)

      // Use compact format for definitions
      for (const definitionKey of allDefinitions) {
        const [filePath, lineNumberStr] = definitionKey.split(':')
        const lineNumber = parseInt(lineNumberStr)

        try {
          const uri = vscode.Uri.file(filePath)
          const targetDocument = await vscode.workspace.openTextDocument(uri)
          const line = targetDocument.lineAt(lineNumber - 1) // Convert back to 0-based index

          dumpContent += `"${identifier}": ${filePath}:${lineNumber}\n`
          dumpContent += `    ${line.text.trim()}\n\n`

          emilyOutputChannel.appendLine(`  ${filePath}:${lineNumber} - ${line.text.trim()}`)
        } catch (error) {
          dumpContent += `"${identifier}": Error reading file - ${error}\n\n`
          emilyOutputChannel.appendLine(`  Error reading file: ${error}`)
        }
      }
    } else {
      identifiersWithoutDefinitions.push(identifier)
      emilyOutputChannel.appendLine(`  No definitions found`)
    }
  }

  // Add summary of identifiers without definitions at the end
  if (identifiersWithoutDefinitions.length > 0) {
    dumpContent += `## Identifiers Without Definitions\n\n`
    dumpContent += `**${identifiersWithoutDefinitions.length} identifier(s) with no definitions found:**\n\n`
    dumpContent += `${identifiersWithoutDefinitions.join(', ')}\n\n`
  }

  // Update the dump document
  await dumpEditor.edit((editBuilder) => {
    const fullRange = new vscode.Range(0, 0, dumpDocument.lineCount, 0)
    editBuilder.replace(fullRange, dumpContent)
  })

  emilyOutputChannel.appendLine('=== Definition dump completed ===')
  vscode.window.showInformationMessage(`Definition dump completed! Check the new document.`)
}
