import * as vscode from "vscode"

export function activate(context: vscode.ExtensionContext) {
  console.log("Emily Emoji Cycler is now active!")

  let disposable = vscode.commands.registerCommand("emily.cycleEmoji", () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showInformationMessage("No active editor found")
      return
    }

    const document = editor.document
    if (document.languageId !== "markdown") {
      vscode.window.showInformationMessage(
        "This command only works in markdown files"
      )
      return
    }

    const position = editor.selection.active
    const line = document.lineAt(position.line)
    const lineText = line.text

    // Check if we're on a markdown header line
    const headerMatch = lineText.match(/^(#{1,6})\s*(.*)$/)
    if (!headerMatch) {
      vscode.window.showInformationMessage(
        "Please place your cursor on a markdown header line"
      )
      return
    }

    const config = vscode.workspace.getConfiguration("emily")
    const emojis = config.get<string[]>("emojis", [])

    if (emojis.length === 0) {
      vscode.window.showInformationMessage(
        "No emojis configured. Please add emojis to the extension settings."
      )
      return
    }

    const headerPrefix = headerMatch[1]
    const headerContent = headerMatch[2]

    // Check if there's already an emoji at the start of the header content
    const emojiMatch = headerContent.match(/^(\S+)\s*(.*)$/)
    let currentEmoji = ""
    let remainingContent = headerContent

    if (emojiMatch) {
      const firstWord = emojiMatch[1]
      // Check if the first word is one of our configured emojis
      if (emojis.includes(firstWord)) {
        currentEmoji = firstWord
        remainingContent = emojiMatch[2]
      }
    }

    // Find the next emoji in the cycle
    let nextEmoji = ""
    if (currentEmoji === "") {
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
    if (nextEmoji === emojis[0] && currentEmoji !== "") {
      nextEmoji = ""
    }

    // Construct the new header line
    const newHeaderContent = nextEmoji
      ? `${nextEmoji} ${remainingContent}`.trim()
      : remainingContent
    const newLineText = `${headerPrefix} ${newHeaderContent}`

    // Replace the line
    const range = new vscode.Range(
      line.lineNumber,
      0,
      line.lineNumber,
      line.text.length
    )
    editor.edit((editBuilder) => {
      editBuilder.replace(range, newLineText)
    })
  })

  context.subscriptions.push(disposable)
}

export function deactivate() {}
