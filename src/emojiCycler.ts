import * as vscode from 'vscode'

export function cycleEmoji() {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showInformationMessage('No active editor found')
    return
  }

  const document = editor.document
  if (document.languageId !== 'markdown') {
    vscode.window.showInformationMessage('This command only works in markdown files')
    return
  }

  const position = editor.selection.active
  const line = document.lineAt(position.line)
  const lineText = line.text

  // Check if we're on a markdown header line
  const headerMatch = lineText.match(/^(#{1,6})\s*(.*)$/)
  if (!headerMatch) {
    vscode.window.showInformationMessage('Please place your cursor on a markdown header line')
    return
  }

  const config = vscode.workspace.getConfiguration('emily')
  const emojis = config.get<string[]>('emojis', [])

  if (emojis.length === 0) {
    vscode.window.showInformationMessage(
      'No emojis configured. Please add emojis to the extension settings.'
    )
    return
  }

  const headerPrefix = headerMatch[1]
  const headerContent = headerMatch[2]

  // Calculate cursor position relative to the header content
  const headerPrefixLength = headerPrefix.length + 1 // +1 for the space
  const cursorInContent = position.character - headerPrefixLength

  // Check if there's already an emoji at the start of the header content
  const emojiMatch = headerContent.match(/^(\S+)\s*(.*)$/)
  let currentEmoji = ''
  let remainingContent = headerContent

  if (emojiMatch) {
    const firstWord = emojiMatch[1]
    // Check if the first word is one of our configured emojis
    if (emojis.includes(firstWord)) {
      currentEmoji = firstWord
      remainingContent = emojiMatch[2]
    }
  }

  // Calculate cursor position relative to the remaining content (after emoji)
  let cursorInRemainingContent: number
  if (currentEmoji === '') {
    // No emoji, cursor is relative to the entire header content
    cursorInRemainingContent = cursorInContent
  } else {
    // Emoji present, calculate cursor position relative to content after emoji
    const emojiLength = currentEmoji.length + 1 // +1 for the space
    cursorInRemainingContent = Math.max(0, cursorInContent - emojiLength)
  }

  // Find the next emoji in the cycle
  let nextEmoji = ''
  if (currentEmoji === '') {
    // No emoji currently, add the first one
    nextEmoji = emojis[0]
  } else {
    // Find current emoji index and get the next one
    const currentIndex = emojis.indexOf(currentEmoji)
    if (currentIndex === -1) {
      // Current emoji not in our list, start with first
      nextEmoji = emojis[0]
    } else {
      const nextIndex = (currentIndex + 1) % emojis.length
      nextEmoji = emojis[nextIndex]
    }
  }

  // If we're cycling back to the first emoji, remove the emoji entirely
  if (nextEmoji === emojis[0] && currentEmoji !== '') {
    nextEmoji = ''
  }

  // Construct the new header line
  const newHeaderContent = nextEmoji ? `${nextEmoji} ${remainingContent}`.trim() : remainingContent
  const newLineText = `${headerPrefix} ${newHeaderContent}`

  // Replace the line
  const range = new vscode.Range(line.lineNumber, 0, line.lineNumber, line.text.length)

  editor
    .edit((editBuilder) => {
      editBuilder.replace(range, newLineText)
    })
    .then(() => {
      // Calculate new cursor position
      let newCursorPosition: number

      if (nextEmoji === '') {
        // Emoji was removed, cursor position stays the same relative to content
        newCursorPosition = headerPrefixLength + Math.max(0, cursorInRemainingContent)
      } else if (currentEmoji === '') {
        // Emoji was added, add the new emoji length to the cursor position
        const emojiLength = nextEmoji.length + 1 // +1 for the space
        newCursorPosition = headerPrefixLength + emojiLength + Math.max(0, cursorInRemainingContent)
      } else {
        // Emoji was changed, add the new emoji length to the cursor position
        const emojiLength = nextEmoji.length + 1 // +1 for the space
        newCursorPosition = headerPrefixLength + emojiLength + Math.max(0, cursorInRemainingContent)
      }

      // Set the new cursor position
      const newPosition = new vscode.Position(position.line, newCursorPosition)
      editor.selection = new vscode.Selection(newPosition, newPosition)
    })
}
