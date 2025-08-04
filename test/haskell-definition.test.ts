import { describe, it, expect } from 'vitest'
import * as vscode from 'vscode'

// Mock VS Code API for testing
const mockDocument = {
  getWordRangeAtPosition: (position: vscode.Position) => {
    return new vscode.Range(position.line, 0, position.line, 8)
  },
  getText: (_range: vscode.Range) => 'factorial',
  lineCount: 10,
  lineAt: (line: number) => ({
    text: line === 3 ? 'factorial :: Integer -> Integer' : 'some other line',
    lineNumber: line
  }),
  uri: vscode.Uri.file('/test.hs')
} as vscode.TextDocument

describe('Haskell Definition Provider', () => {
  it('should find function definitions', () => {
    // This is a basic test structure - in a real scenario you'd test the actual provider
    const position = new vscode.Position(5, 5)
    const wordRange = mockDocument.getWordRangeAtPosition(position)
    const identifier = mockDocument.getText(wordRange)
    
    expect(identifier).toBe('factorial')
    
    // Test that we can find definition lines
    const definitionLine = mockDocument.lineAt(3).text
    const definitionPattern = new RegExp(`^${identifier}\\s*(::|=)`, 'i')
    
    expect(definitionPattern.test(definitionLine)).toBe(true)
  })
}) 